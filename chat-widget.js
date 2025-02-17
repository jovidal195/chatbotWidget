/* chat-widget.js */

/**
 * ChatWidget - Widget de discussion configurable.
 *
 * Options disponibles :
 * - alignment: 'left' ou 'right' (default: 'right') - Positionnement du widget sur l'écran.
 * - padding: Espacement en pixels depuis le bord (default: 20).
 * - messageUrl: URL pour l'appel AJAX (default: '').
 * - recordButton: booléen pour afficher ou non le bouton d'enregistrement (default: true).
 * - i18n: objet de traduction (default:
 *     {
 *       title: 'Chat',
 *       placeholder: 'Votre message...',
 *       minimizeButton: '–'
 *     }
 *   ).
 */
function ChatWidget(options) {
  var defaults = {
    alignment: 'right',
    botName : 'Bot',
    padding: 20,
    recordUrl: '',
    messageUrl: '',
	apiKey: undefined, //je m'attends à un dictionnaire
    recordButton: false,
	maintain2Record: true,
	user: "Vous",
	width : "300px",
	height : "200px",
    i18n: {
      title: 'Chat',
      placeholder: 'Votre message...',
      minimizeButton: '–'
    }
  };
  this.options = Object.assign({}, defaults, options || {});
  this.options.i18n = Object.assign({}, defaults.i18n, (options && options.i18n) || {});

  this.container = document.createElement('div');
  this.container.id = 'chat-widget';
  this.container.style.bottom = this.options.padding + 'px';
  if (this.options.alignment === 'left') {
    this.container.style.left = this.options.padding + 'px';
  } else {
    this.container.style.right = this.options.padding + 'px';
  }

	// Ajout de la boîte d'erreur
  this.errorBox = document.createElement('div');
  this.errorBox.id = 'chat-error-box';
  this.errorBox.style.backgroundColor = 'red';
  this.errorBox.style.color = 'white';
  this.errorBox.style.padding = '10px';
  this.errorBox.style.margin = '10px';
  this.errorBox.style.position = 'absolute';
  this.errorBox.style.top = '0';
  this.errorBox.style.left = '0';
  this.errorBox.style.right = '0';
  this.errorBox.style.textAlign = 'center';
  this.errorBox.style.zIndex = '1000'; // s'assure qu'il est devant
  this.errorBox.style.display = 'none'; // caché par défaut
  this.container.appendChild(this.errorBox);
  
  this.loading = document.createElement('div');
  this.loading.id = "chatLoading";
  this.loading.style.padding = '10px';
  this.loading.style.margin = '10px';
  this.loading.style.position = 'absolute';
  this.loading.style.top = '35%';
  this.loading.style.left = '37%';
  this.loading.style.zIndex = '1005';
  this.loading.style.display = "none";
  this.container.appendChild(this.loading);

  this.header = document.createElement('div');
  this.header.className = 'chat-header';

  this.title = document.createElement('span');
  this.title.className = 'chat-title';
  this.title.textContent = this.options.i18n.title;
  this.header.appendChild(this.title);

  this.minimizeButton = document.createElement('button');
  this.minimizeButton.className = 'chat-minimize-button';
  this.minimizeButton.textContent = this.options.i18n.minimizeButton;
  var self = this;
  this.minimizeButton.addEventListener('click', function() {
    self.toggleMinimize();
  });
  this.header.appendChild(this.minimizeButton);

  this.container.appendChild(this.header);

  this.chatArea = document.createElement('div');
  this.chatArea.className = 'chat-area';
  this.container.appendChild(this.chatArea);

  this.inputContainer = document.createElement('div');
  this.inputContainer.className = 'chat-input-container';
  
  this.inputField = document.createElement('input');
  this.inputField.type = 'text';
  this.inputField.placeholder = this.options.i18n.placeholder;
  this.inputContainer.appendChild(this.inputField);
  
  if (this.options.width) {
    this.container.style.width = this.options.width;
  }
  if (this.options.height) {
    let chatArea = this.container.querySelector('.chat-area');
    if (chatArea) {
	  chatArea.style.height = this.options.height;
    }
  }
  
  if (this.options.maintain2Record) {
	  if (this.options.recordButton) {
		this.recordButton = document.createElement('button');
		this.recordButton.id = 'chat-record-button';
		var recordDot = document.createElement('span');
		recordDot.className = 'record-dot';
		this.recordButton.appendChild(recordDot);
		
		this.recordButton.addEventListener('mousedown', () => {
            this.recordButton.classList.add('recording');
            this.startRecording();
        });

        this.recordButton.addEventListener('mouseup', () => {
            this.recordButton.classList.remove('recording');
            this.stopRecording();
        });

        this.recordButton.addEventListener('mouseleave', () => {
            this.recordButton.classList.remove('recording');
            this.stopRecording();
        });

		this.inputContainer.appendChild(this.recordButton);
	}
  } else {
	  if (this.options.recordButton) {
		this.recordButton = document.createElement('button');
		this.recordButton.id = 'chat-record-button';
		var recordDot = document.createElement('span');
		recordDot.className = 'record-dot';
		this.recordButton.appendChild(recordDot);
		
		this.recordButton.addEventListener('click', () => {
            this.recordButton.classList.toggle('recording');
            this.toggleRecording();
        });
		
		this.inputContainer.appendChild(this.recordButton);
	  }	  
  }

  this.inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && self.inputField.value.trim() !== '') {
      self.sendMessage();
    }
  });

  this.container.appendChild(this.inputContainer);
  document.body.appendChild(this.container);
}

ChatWidget.prototype.showError = function(message) {
  this.errorBox.textContent = message;
  this.errorBox.style.display = 'block';
  // Vous pouvez éventuellement masquer la boîte après quelques secondes
  setTimeout(() => {
    this.errorBox.style.display = 'none';
  }, 3000);
};

/**
 * Envoie un message saisi par l'utilisateur.
 * - Ajoute le message à la zone de chat.
 * - Effectue un appel AJAX si une URL est spécifiée.
 */
ChatWidget.prototype.sendMessage = function() {
  var message = this.inputField.value.trim();
  if (message === '') return;

  this.addMessage(this.options.user, message);
  this.inputField.value = '';

  if (this.options.messageUrl) {
    this.sendAjax(message);
  }
};

ChatWidget.prototype.startRecording = function() {
  var self = this;
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      self.mediaRecorder = new MediaRecorder(stream);
      self.recordedChunks = [];

      self.mediaRecorder.ondataavailable = function(e) {
        self.recordedChunks.push(e.data);
      };

      self.mediaRecorder.onstop = function() {
        var blob = new Blob(self.recordedChunks, { type: 'audio/wav' });
        self.sendAudio(blob);
      };

      self.mediaRecorder.start();
      self.recordButton.classList.add('recording');
    })
    .catch(function(err) {
      console.error('Permission refusée pour accéder au microphone', err);
    });
};

ChatWidget.prototype.stopRecording = function() {
  if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
    this.mediaRecorder.stop();
    this.recordButton.classList.remove('recording');
  }
};

ChatWidget.prototype.toggleRecording = function() {
  if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
    this.stopRecording();
  } else {
    this.startRecording();
  }
};

ChatWidget.prototype.sendAudio = function(blob) {
  var formData = new FormData();
  formData.append('audio', blob, 'enregistrement_vocal_' + Date.now() + '.wav');

  fetch(this.options.recordUrl, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log('Réponse du serveur:', data);
	this.addMessage(this.options.user, data.reply || 'Pas de réponse');
	
	if (this.options.messageUrl) {
		this.sendAjax(data.reply, voice=true);
	}
	
  })
  .catch(error => {
    console.error('Erreur lors de l\'envoi de l\'enregistrement vocal', error);
	this.showError("Erreur: " + error.message);
  });
};

/**
 * Ajoute un message dans la zone de chat.
 *
 * @param {string} sender - Le nom de l'émetteur du message.
 * @param {string} text - Le contenu du message.
 */
ChatWidget.prototype.addMessage = function(sender, text, audioBase64 = null) {
  var messageElem = document.createElement('div');
  messageElem.classList.add("nouvelle-classe");
  messageElem.style.margin = '5px 0';
  messageElem.innerHTML = '<strong>' + sender + ' :</strong> ' + text;
  
  if (audioBase64) {
    let audio = new Audio("data:audio/mp3;base64," + audioBase64);

    // Création du bouton Play/Stop
    let playButton = document.createElement("button");
    playButton.innerText = "▶️";
    playButton.style.marginLeft = "10px";
  // Gestion du clic sur le bouton
    playButton.onclick = function() {
      if (audio.paused) {
        audio.play();
        playButton.innerText = "⏹️";
      } else {
        audio.pause();
        audio.currentTime = 0; // Remettre à zéro
        playButton.innerText = "▶️";
      }
    };

    // Remettre Play quand l'audio est terminé
    audio.onended = function() {
      playButton.innerText = "▶️";
    };

    // Ajouter le bouton au message
    messageElem.appendChild(playButton);
	
	// **Jouer automatiquement l'audio**
    audio.play().catch(error => console.error("Lecture automatique bloquée :", error));
    playButton.innerText = "⏹️"; // Mettre à jour le bouton pour indiquer que l'audio joue
  }
  
  
  this.chatArea.appendChild(messageElem);
  this.chatArea.scrollTop = this.chatArea.scrollHeight;
};

/**
 * Effectue un appel AJAX pour envoyer un message et recevoir une réponse.
 * La réponse doit être au format JSON avec une clé `reply`.
 *
 * Exemple de réponse attendue :
 * { "reply": "Bonjour, comment puis-je vous aider ?" }
 *
 * @param {string} message - Le message envoyé.
 */
ChatWidget.prototype.sendAjax = function(message, voice=false) {
  var self = this;
  const loader = this.loading
  loader.style.display = "initial";
  let elements = document.querySelectorAll(".messageElem");

  // Extraction du texte de chaque élément et concaténation dans une seule chaîne
  let contexte = Array.from(elements).map(el => el.textContent).join("\n");
  
  let body = { message: message , system : contexte}

  if(this.options.apiKey)  {
	  body = { ...body, ...apiKey };
  }
  
  if(voice)  {
	  body = { ...body, "voice":true };
  }
  
  console.log(body);
  
  fetch(this.options.messageUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Erreur réseau');
    }
    return response.json();
  })
  .then(function(data) {
    self.addMessage(self.options.botName, data.reply || 'Pas de réponse', data.audio);
	console.log(data);
	loader.style.display = "none";
	
	// Lecture de l'audio si disponible
    /*if (data.audio) {
      let audio = new Audio("data:audio/mp3;base64," + data.audio);
      audio.play().catch(error => console.error("Erreur de lecture audio:", error));
    }*/
  })
  .catch(function(error) {
    console.error('Erreur AJAX:', error);
	loader.style.display = "none";
    self.addMessage(self.options.botName, 'Erreur lors de la récupération de la réponse.');
  });
};

/**
 * Bascule l'état minimisé du widget.
 */
ChatWidget.prototype.toggleMinimize = function() {
  if (this.container.classList.contains('minimized')) {
    this.container.classList.remove('minimized');
    this.chatArea.style.display = 'block';
    this.inputContainer.style.display = 'flex';
  } else {
    this.container.classList.add('minimized');
    this.chatArea.style.display = 'none';
    this.inputContainer.style.display = 'none';
  }
};