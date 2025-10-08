// google-script.js - Funções para disparo de eventos Google Ads via gtag
// ATENÇÃO: Este script depende que o gtag já esteja carregado no site!

// Variável global para armazenar a configuração
var config = { pixels: [] };

// Função para obter o caminho do script atual
function getScriptPath() {
  // Tenta encontrar o script atual entre os scripts carregados
  var scripts = document.getElementsByTagName('script');
  var scriptPath = '';
  
  // Procura pelo script que contém 'google-script.js'
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    if (src && src.indexOf('google-script.js') !== -1) {
      // Extrai o caminho base do script
      scriptPath = src.substring(0, src.lastIndexOf('/') + 1);
      break;
    }
  }
  
  return scriptPath;
}

// Função para carregar a configuração
function loadConfig() {
  var xhr = new XMLHttpRequest();
  var scriptPath = getScriptPath();
  var configPath = scriptPath + 'google.config.json';
  
  console.log('🔧 [GOOGLE] Carregando configuração de:', configPath);
  xhr.open('GET', configPath, true); // Assíncrono
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          config = JSON.parse(xhr.responseText);
          console.log('✅ [GOOGLE] Configuração carregada:', config);
          initGtag(); // Inicializa o gtag após carregar a configuração
        } catch (e) {
          console.error('❌ [GOOGLE] Erro ao parsear configuração:', e);
        }
      } else {
        console.error('❌ [GOOGLE] Erro ao carregar configuração:', xhr.status, xhr.statusText);
      }
    }
  };
  try {
    xhr.send();
  } catch (e) {
    console.error('❌ [GOOGLE] Erro ao enviar requisição:', e);
  }
}

// Auto-inicialização do Google Tag para todos os pixels cadastrados
function initGtag() {
  if (typeof window === 'undefined') {
    console.error('❌ [GOOGLE] Window não disponível');
    return;
  }
  
  console.log('🔧 [GOOGLE] Inicializando gtag...');
  
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = function(){ window.dataLayer.push(arguments); };
    console.log('✅ [GOOGLE] window.gtag criado');
  }

  console.log('🔧 [GOOGLE] Configuração disponível:', {
    hasConfig: !!config,
    pixels: config ? config.pixels : null,
    pixelsLength: config && config.pixels ? config.pixels.length : 0
  });

  // Adiciona o script do gtag.js para cada pixel (evita duplicidade)
  var addedIds = new Set();
  (config.pixels || []).forEach(function(pixel) {
    console.log('🔧 [GOOGLE] Processando pixel:', pixel.name, pixel.gtag_id);
    
    if (!pixel.gtag_id || addedIds.has(pixel.gtag_id)) {
      console.log('⚠️ [GOOGLE] Pixel ignorado (sem ID ou duplicado):', pixel.name);
      return;
    }
    
    addedIds.add(pixel.gtag_id);
    if (!document.querySelector('script[src*="gtag/js?id=' + pixel.gtag_id + '"]')) {
      console.log('📥 [GOOGLE] Carregando script gtag para:', pixel.gtag_id);
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + pixel.gtag_id;
      document.head.appendChild(script);
    } else {
      console.log('✅ [GOOGLE] Script gtag já carregado para:', pixel.gtag_id);
    }
    
    window.gtag('js', new Date());
    window.gtag('config', pixel.gtag_id);
    console.log('✅ [GOOGLE] Pixel configurado:', pixel.gtag_id);
  });
  
  console.log('✅ [GOOGLE] Inicialização do gtag concluída. Total de pixels:', addedIds.size);
}

function getPixelConfig(pixelName) {
  if (!config.pixels || !Array.isArray(config.pixels)) return null;
  if (!pixelName) return config.pixels[0];
  return config.pixels.find(function(p) { return p.name === pixelName; }) || config.pixels[0];
}

function fireGooglePageView() {
  if (!config.pixels || !Array.isArray(config.pixels) || !window.gtag) return;
  config.pixels.forEach(function(pixel) {
    var params = (pixel.page_view_event && pixel.page_view_event.params) || {};
    window.gtag('event', 'page_view', params);
  });
}

function fireGooglePurchase(options) {
  var value = options.value || 0;
  var currency = options.currency || 'BRL';
  var transaction_id = options.transaction_id;
  var extraParams = options.extraParams || {};
  
  console.log('🔧 [GOOGLE] Config status:', {
    hasConfig: !!config,
    hasPixels: !!(config && config.pixels),
    pixelsCount: config && config.pixels ? config.pixels.length : 0,
    hasGtag: !!window.gtag
  });
  
  if (!config.pixels || !Array.isArray(config.pixels) || !window.gtag) {
    console.error('❌ [GOOGLE] Missing dependencies:', {
      config: !!config,
      pixels: !!(config && config.pixels),
      gtag: !!window.gtag
    });
    return;
  }
  
  // Disparar para todos os pixels configurados
  config.pixels.forEach(function(pixel) {
    console.log('🔧 [GOOGLE] Processing pixel:', pixel.name, pixel);
    
    var eventParams = {
      currency: currency,
      value: value
    };
    
    // Adicionar extraParams ao eventParams
    for (var key in extraParams) {
      if (extraParams.hasOwnProperty(key)) {
        eventParams[key] = extraParams[key];
      }
    }
    
    if (transaction_id) eventParams.transaction_id = transaction_id;
    
    // Adicionar parâmetros específicos do pixel, se existirem
    if (pixel.purchase_event && pixel.purchase_event.params) {
      console.log('🔧 [GOOGLE] Adding pixel params:', pixel.purchase_event.params);
      for (var paramKey in pixel.purchase_event.params) {
        if (pixel.purchase_event.params.hasOwnProperty(paramKey)) {
          eventParams[paramKey] = pixel.purchase_event.params[paramKey];
        }
      }
    } else {
      console.warn('⚠️ [GOOGLE] No purchase_event.params found for pixel:', pixel.name);
    }
    
    // Disparar evento específico para este pixel
    console.log('🎯 [GOOGLE] Final eventParams for pixel', pixel.name + ':', eventParams);
    window.gtag('event', 'purchase', eventParams);
  });
}

// Expor funções globalmente
window.googlePixel = {
  firePageView: fireGooglePageView,
  firePurchase: fireGooglePurchase
};

// Iniciar o carregamento da configuração quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  loadConfig();
  
  // Adicionar um pequeno atraso para garantir que a configuração seja carregada
  setTimeout(function() {
    // Disparar o evento de page_view automaticamente
    if (window.googlePixel && typeof window.googlePixel.firePageView === 'function') {
      console.log('Disparando evento de page_view automaticamente');
      window.googlePixel.firePageView();
    }
  }, 1000); // 1 segundo de atraso para garantir que a configuração foi carregada
});
