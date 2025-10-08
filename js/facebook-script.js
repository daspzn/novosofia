// facebook-script.js - Funções para disparo de eventos Facebook Pixel via fbq
// Este script inclui a inicialização completa do Facebook Pixel

// Inicializar Facebook Pixel base
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

console.log('✅ [FACEBOOK] Facebook Pixel base inicializado');

// Variável global para armazenar a configuração do Facebook
var facebookConfig = { pixels: [] };

// Função para obter o caminho do script atual do Facebook
function getFacebookScriptPath() {
  // Tenta encontrar o script atual entre os scripts carregados
  var scripts = document.getElementsByTagName('script');
  var scriptPath = '';
  
  // Procura pelo script que contém 'facebook-script.js'
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    if (src && src.indexOf('facebook-script.js') !== -1) {
      // Extrai o caminho base do script
      scriptPath = src.substring(0, src.lastIndexOf('/') + 1);
      break;
    }
  }
  
  return scriptPath;
}

// Função para carregar a configuração do Facebook
function loadFacebookConfig() {
  var xhr = new XMLHttpRequest();
  var scriptPath = getFacebookScriptPath();
  var configPath = scriptPath + 'facebook.config.json';
  
  console.log('🔧 [FACEBOOK] Carregando configuração de:', configPath);
  xhr.open('GET', configPath, true); // Assíncrono
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          facebookConfig = JSON.parse(xhr.responseText);
          console.log('✅ [FACEBOOK] Configuração carregada:', facebookConfig);
          initFacebookPixel(); // Inicializa o Facebook Pixel após carregar a configuração
        } catch (e) {
          console.error('❌ [FACEBOOK] Erro ao parsear configuração:', e);
        }
      } else {
        console.error('❌ [FACEBOOK] Erro ao carregar configuração:', xhr.status, xhr.statusText);
      }
    }
  };
  try {
    xhr.send();
  } catch (e) {
    console.error('❌ [FACEBOOK] Erro ao enviar requisição:', e);
  }
}

// Auto-inicialização do Facebook Pixel para todos os pixels cadastrados
function initFacebookPixel() {
  if (typeof window === 'undefined') {
    console.error('❌ [FACEBOOK] Window não disponível');
    return;
  }
  
  console.log('🔧 [FACEBOOK] Inicializando Facebook Pixel...');
  
  if (!window.fbq) {
    console.error('❌ [FACEBOOK] fbq não disponível. Certifique-se de que o Facebook Pixel está carregado.');
    return;
  }

  console.log('🔧 [FACEBOOK] Configuração disponível:', {
    hasConfig: !!facebookConfig,
    pixels: facebookConfig ? facebookConfig.pixels : null,
    pixelsLength: facebookConfig && facebookConfig.pixels ? facebookConfig.pixels.length : 0
  });

  // Inicializar cada pixel configurado
  var initializedPixels = [];
  (facebookConfig.pixels || []).forEach(function(pixel) {
    console.log('🔧 [FACEBOOK] Processando pixel:', pixel.name, pixel.pixelId);
    
    if (!pixel.pixelId) {
      console.log('⚠️ [FACEBOOK] Pixel ignorado (sem pixelId):', pixel.name);
      return;
    }
    
    try {
      window.fbq('init', pixel.pixelId);
      initializedPixels.push(pixel);
      console.log('✅ [FACEBOOK] Pixel inicializado:', pixel.pixelId);
    } catch (e) {
      console.error('❌ [FACEBOOK] Erro ao inicializar pixel:', pixel.pixelId, e);
    }
  });
  
  console.log('✅ [FACEBOOK] Inicialização do Facebook Pixel concluída. Total de pixels:', initializedPixels.length);
}

function getPixelConfig(pixelName) {
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels)) return null;
  if (!pixelName) return facebookConfig.pixels[0];
  return facebookConfig.pixels.find(function(p) { return p.name === pixelName; }) || facebookConfig.pixels[0];
}

function fireFacebookPageView() {
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies for PageView');
    return;
  }
  
  console.log('🎯 [FACEBOOK] Disparando PageView para todos os pixels');
  
  // Disparar via Pixel (browser)
  window.fbq('track', 'PageView');
  
  // Disparar via Conversions API (server-side)
  var userData = extractUserData();
  var customData = {
    content_type: 'website'
  };
  
  sendFacebookConversionAPIEvent('PageView', customData, userData);
}

function fireFacebookPurchase(options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var content_ids = options.content_ids || [];
  var content_type = options.content_type || 'product';
  var extraParams = options.extraParams || {};
  
  console.log('🔧 [FACEBOOK] Config status:', {
    hasConfig: !!facebookConfig,
    hasPixels: !!(facebookConfig && facebookConfig.pixels),
    pixelsCount: facebookConfig && facebookConfig.pixels ? facebookConfig.pixels.length : 0,
    hasFbq: !!window.fbq
  });
  
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies:', {
      config: !!facebookConfig,
      pixels: !!(facebookConfig && facebookConfig.pixels),
      fbq: !!window.fbq
    });
    return;
  }
  
  // Disparar para todos os pixels configurados que têm o evento purchase habilitado
  facebookConfig.pixels.forEach(function(pixel) {
    if (!pixel.events || !pixel.events.purchase || !pixel.events.purchase.enabled) {
      console.log('⚠️ [FACEBOOK] Evento Purchase desabilitado para pixel:', pixel.name);
      return;
    }
    
    console.log('🔧 [FACEBOOK] Processing purchase for pixel:', pixel.name, pixel.pixelId);
    
    var eventParams = {
      value: value,
      currency: currency,
      content_type: content_type
    };
    
    if (content_ids.length > 0) {
      eventParams.content_ids = content_ids;
    }
    
    // Adicionar extraParams ao eventParams
    for (var key in extraParams) {
      if (extraParams.hasOwnProperty(key)) {
        eventParams[key] = extraParams[key];
      }
    }
    
    // Adicionar parâmetros específicos do pixel, se existirem
    if (pixel.events.purchase.params) {
      console.log('🔧 [FACEBOOK] Adding pixel params:', pixel.events.purchase.params);
      for (var paramKey in pixel.events.purchase.params) {
        if (pixel.events.purchase.params.hasOwnProperty(paramKey)) {
          eventParams[paramKey] = pixel.events.purchase.params[paramKey];
        }
      }
    }
    
    // Disparar evento específico para este pixel via browser
    console.log('🎯 [FACEBOOK] Final eventParams for pixel', pixel.name + ':', eventParams);
    window.fbq('track', 'Purchase', eventParams);
  });
  
  // Disparar via Conversions API (server-side)
  var userData = extractUserData();
  
  // Adicionar dados do cliente dos extraParams se disponíveis
  if (extraParams.customer_name) {
    var names = extraParams.customer_name.toLowerCase().trim().split(' ');
    userData.fn = hashString(names[0]);
    if (names.length > 1) {
      userData.ln = hashString(names[names.length - 1]);
    }
  }
  
  if (extraParams.customer_email) {
    userData.em = hashString(extraParams.customer_email.toLowerCase().trim());
  }
  
  var apiCustomData = {
    currency: currency,
    value: value,
    content_type: content_type,
    content_ids: content_ids,
    transaction_id: extraParams.transaction_id || '',
    payment_method: extraParams.payment_method || ''
  };
  
  // Adicionar dados UTM se disponíveis
  if (extraParams.utm_source) apiCustomData.utm_source = extraParams.utm_source;
  if (extraParams.utm_campaign) apiCustomData.utm_campaign = extraParams.utm_campaign;
  if (extraParams.fbclid) apiCustomData.fbclid = extraParams.fbclid;
  
  sendFacebookConversionAPIEvent('Purchase', apiCustomData, userData);
}

function fireFacebookInitiateCheckout(options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var content_ids = options.content_ids || [];
  var content_type = options.content_type || 'product';
  var num_items = options.num_items || 1;
  var extraParams = options.extraParams || {};
  
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies for InitiateCheckout');
    return;
  }
  
  facebookConfig.pixels.forEach(function(pixel) {
    if (!pixel.events || !pixel.events.initiate_checkout || !pixel.events.initiate_checkout.enabled) {
      console.log('⚠️ [FACEBOOK] Evento InitiateCheckout desabilitado para pixel:', pixel.name);
      return;
    }
    
    console.log('🔧 [FACEBOOK] Processing InitiateCheckout for pixel:', pixel.name);
    
    var eventParams = {
      value: value,
      currency: currency,
      content_type: content_type,
      num_items: num_items
    };
    
    if (content_ids.length > 0) {
      eventParams.content_ids = content_ids;
    }
    
    // Adicionar extraParams
    for (var key in extraParams) {
      if (extraParams.hasOwnProperty(key)) {
        eventParams[key] = extraParams[key];
      }
    }
    
    // Adicionar parâmetros específicos do pixel
    if (pixel.events.initiate_checkout.params) {
      for (var paramKey in pixel.events.initiate_checkout.params) {
        if (pixel.events.initiate_checkout.params.hasOwnProperty(paramKey)) {
          eventParams[paramKey] = pixel.events.initiate_checkout.params[paramKey];
        }
      }
    }
    
    console.log('🎯 [FACEBOOK] InitiateCheckout eventParams:', eventParams);
    window.fbq('track', 'InitiateCheckout', eventParams);
  });
  
  // Disparar via Conversions API (server-side)
  var userData = extractUserData();
  
  // Adicionar dados do cliente dos extraParams se disponíveis
  if (extraParams.customer_name) {
    var names = extraParams.customer_name.toLowerCase().trim().split(' ');
    userData.fn = hashString(names[0]);
    if (names.length > 1) {
      userData.ln = hashString(names[names.length - 1]);
    }
  }
  
  if (extraParams.customer_email) {
    userData.em = hashString(extraParams.customer_email.toLowerCase().trim());
  }
  
  var apiCustomData = {
    currency: currency,
    value: value,
    content_type: content_type,
    content_ids: content_ids,
    num_items: num_items,
    transaction_id: extraParams.transaction_id || ''
  };
  
  // Adicionar dados UTM se disponíveis
  if (extraParams.utm_source) apiCustomData.utm_source = extraParams.utm_source;
  if (extraParams.utm_campaign) apiCustomData.utm_campaign = extraParams.utm_campaign;
  
  sendFacebookConversionAPIEvent('InitiateCheckout', apiCustomData, userData);
}

function fireFacebookAddToCart(options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var content_ids = options.content_ids || [];
  var content_type = options.content_type || 'product';
  var extraParams = options.extraParams || {};
  
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies for AddToCart');
    return;
  }
  
  facebookConfig.pixels.forEach(function(pixel) {
    if (!pixel.events || !pixel.events.add_to_cart || !pixel.events.add_to_cart.enabled) {
      console.log('⚠️ [FACEBOOK] Evento AddToCart desabilitado para pixel:', pixel.name);
      return;
    }
    
    console.log('🔧 [FACEBOOK] Processing AddToCart for pixel:', pixel.name);
    
    var eventParams = {
      value: value,
      currency: currency,
      content_type: content_type
    };
    
    if (content_ids.length > 0) {
      eventParams.content_ids = content_ids;
    }
    
    // Adicionar extraParams
    for (var key in extraParams) {
      if (extraParams.hasOwnProperty(key)) {
        eventParams[key] = extraParams[key];
      }
    }
    
    // Adicionar parâmetros específicos do pixel
    if (pixel.events.add_to_cart.params) {
      for (var paramKey in pixel.events.add_to_cart.params) {
        if (pixel.events.add_to_cart.params.hasOwnProperty(paramKey)) {
          eventParams[paramKey] = pixel.events.add_to_cart.params[paramKey];
        }
      }
    }
    
    console.log('🎯 [FACEBOOK] AddToCart eventParams:', eventParams);
    window.fbq('track', 'AddToCart', eventParams);
  });
}

function fireFacebookLead(options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var content_name = options.content_name || '';
  var extraParams = options.extraParams || {};
  
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies for Lead');
    return;
  }
  
  facebookConfig.pixels.forEach(function(pixel) {
    if (!pixel.events || !pixel.events.lead || !pixel.events.lead.enabled) {
      console.log('⚠️ [FACEBOOK] Evento Lead desabilitado para pixel:', pixel.name);
      return;
    }
    
    console.log('🔧 [FACEBOOK] Processing Lead for pixel:', pixel.name);
    
    var eventParams = {
      value: value,
      currency: currency
    };
    
    if (content_name) {
      eventParams.content_name = content_name;
    }
    
    // Adicionar extraParams
    for (var key in extraParams) {
      if (extraParams.hasOwnProperty(key)) {
        eventParams[key] = extraParams[key];
      }
    }
    
    // Adicionar parâmetros específicos do pixel
    if (pixel.events.lead.params) {
      for (var paramKey in pixel.events.lead.params) {
        if (pixel.events.lead.params.hasOwnProperty(paramKey)) {
          eventParams[paramKey] = pixel.events.lead.params[paramKey];
        }
      }
    }
    
    console.log('🎯 [FACEBOOK] Lead eventParams:', eventParams);
    window.fbq('track', 'Lead', eventParams);
  });
}

// Função genérica para disparar qualquer evento customizado
function fireFacebookCustomEvent(eventName, options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var extraParams = options.extraParams || {};
  
  if (!facebookConfig.pixels || !Array.isArray(facebookConfig.pixels) || !window.fbq) {
    console.error('❌ [FACEBOOK] Missing dependencies for custom event:', eventName);
    return;
  }
  
  var eventParams = {
    value: value,
    currency: currency
  };
  
  // Adicionar extraParams
  for (var key in extraParams) {
    if (extraParams.hasOwnProperty(key)) {
      eventParams[key] = extraParams[key];
    }
  }
  
  console.log('🎯 [FACEBOOK] Disparando evento customizado:', eventName, eventParams);
  window.fbq('trackCustom', eventName, eventParams);
}

// Função para enviar evento via Facebook Conversions API
function sendFacebookConversionAPIEvent(eventName, customData, userData, eventId) {
  var apiPath = getFacebookScriptPath().replace('/pixel/', '/api/') + 'fb_conversion_api.php';
  
  console.log('🔧 [FACEBOOK API] Enviando evento via Conversions API:', eventName);
  
  var payload = {
    eventName: eventName,
    eventId: eventId || generateEventId(),
    eventTime: Math.floor(Date.now() / 1000),
    customData: customData || {},
    userData: userData || {}
  };
  
  console.log('📤 [FACEBOOK API] Payload:', payload);
  
  fetch(apiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    console.log('✅ [FACEBOOK API] Resposta da Conversions API:', data);
  })
  .catch(function(error) {
    console.error('❌ [FACEBOOK API] Erro na Conversions API:', error);
  });
}

// Função para gerar ID único do evento
function generateEventId() {
  return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Função para extrair dados do usuário da página atual
function extractUserData() {
  var userData = {};
  
  // Tentar extrair email de campos do formulário
  var emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
  if (emailFields.length > 0 && emailFields[0].value) {
    userData.em = hashString(emailFields[0].value.toLowerCase().trim());
  }
  
  // Tentar extrair telefone de campos do formulário
  var phoneFields = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[name*="telefone"], input[id*="phone"], input[id*="telefone"]');
  if (phoneFields.length > 0 && phoneFields[0].value) {
    userData.ph = hashString(phoneFields[0].value.replace(/[^0-9]/g, ''));
  }
  
  // Tentar extrair nome de campos do formulário
  var nameFields = document.querySelectorAll('input[name*="name"], input[name*="nome"], input[id*="name"], input[id*="nome"]');
  if (nameFields.length > 0 && nameFields[0].value) {
    var names = nameFields[0].value.trim().toLowerCase().split(' ');
    userData.fn = hashString(names[0]);
    if (names.length > 1) {
      userData.ln = hashString(names[names.length - 1]);
    }
  }
  
  return userData;
}

// Função simples de hash (substituto para crypto quando não disponível)
function hashString(str) {
  // Em produção, você deveria usar uma biblioteca de hash SHA-256
  // Por enquanto, retornamos o valor em hash simples para demonstração
  var hash = 0;
  if (str.length === 0) return hash.toString();
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}

// Expor funções globalmente
window.facebookPixel = {
  firePageView: fireFacebookPageView,
  firePurchase: fireFacebookPurchase,
  fireInitiateCheckout: fireFacebookInitiateCheckout,
  fireAddToCart: fireFacebookAddToCart,
  fireLead: fireFacebookLead,
  fireCustomEvent: fireFacebookCustomEvent,
  sendConversionAPI: sendFacebookConversionAPIEvent,
  extractUserData: extractUserData
};

// Iniciar o carregamento da configuração quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  loadFacebookConfig();
  
  // Adicionar um pequeno atraso para garantir que a configuração seja carregada
  setTimeout(function() {
    // Disparar o evento de page_view automaticamente
    if (window.facebookPixel && typeof window.facebookPixel.firePageView === 'function') {
      console.log('🎯 [FACEBOOK] Disparando evento de page_view automaticamente');
      window.facebookPixel.firePageView();
    }
  }, 1000); // 1 segundo de atraso para garantir que a configuração foi carregada
});