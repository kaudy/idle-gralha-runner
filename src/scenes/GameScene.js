import * as Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
		this.gameSpeed = 5; 
	}

	init() {
		let savePadrao = {
			moedas: 0, inimigosMortos: 0, mortes: 0,
			hpMaximo: 3, hpAtual: 3,
			temEspada: false, temTiro: false, nivelMoedasInimigo: 0 
		};
		
		let saveSalvo = sessionStorage.getItem('gralha_save');
		this.status = saveSalvo ? JSON.parse(saveSalvo) : savePadrao;
		if (this.status.nivelMoedasInimigo === undefined) this.status.nivelMoedasInimigo = 0;
	}

	preload() {
		let g = this.make.graphics({ x: 0, y: 0, add: false });
		
		g.fillStyle(0x4a752c, 1); g.fillRect(0, 0, 128, 64); g.fillStyle(0x36541f, 1); g.fillRect(0, 0, 32, 64); g.generateTexture('textura_chao', 128, 64);
		g.clear(); g.fillStyle(0x1a3320, 1); g.fillRect(0, 32, 128, 96); g.fillRect(32, 0, 64, 128); g.generateTexture('textura_fundo', 128, 128);

		const desenharGralha = (asaParaCima, alturaPulo, nomeTextura) => {
			g.clear(); let y = alturaPulo ? 5 : 10;
			g.fillStyle(0x0055cc, 1); g.fillRect(5, y, 25, 25); g.fillStyle(0xffffff, 1); g.fillRect(15, y + 10, 15, 15);
			g.fillStyle(0xffffff, 1); g.fillRect(18, y + 3, 6, 6); g.fillStyle(0x000000, 1); g.fillRect(21, y + 5, 3, 3);
			g.fillStyle(0xffdd00, 1); g.fillRect(30, y + 7, 8, 6);
			g.fillStyle(0x002277, 1); if (asaParaCima) { g.fillRect(2, y + 3, 14, 8); } else { g.fillRect(2, y + 10, 14, 8); }
			g.generateTexture(nomeTextura, 40, 40);
		};
		desenharGralha(false, false, 'gralha_correndo_0'); desenharGralha(true, false, 'gralha_correndo_1'); desenharGralha(true, true, 'gralha_pulando');

		g.clear(); g.fillStyle(0xffcc00, 1); g.fillCircle(10, 10, 10); g.fillStyle(0xffaa00, 1); g.fillCircle(10, 10, 6); g.generateTexture('moeda', 20, 20);
		g.clear(); g.fillStyle(0x8B4513, 1); g.fillRect(0, 10, 30, 30); g.fillStyle(0xFFD700, 1); g.fillRect(5, 0, 20, 10); g.generateTexture('inimigo_teco', 30, 40);
		g.clear(); g.fillStyle(0x006400, 1); g.fillRect(0, 0, 35, 40); g.fillStyle(0xFFFFFF, 1); g.fillRect(0, 5, 35, 10); g.fillRect(0, 25, 35, 10); g.generateTexture('inimigo_vovo', 35, 40);
		g.clear(); g.fillStyle(0x000000, 1); g.fillRect(0, 0, 15, 40); g.fillStyle(0xFF0000, 1); g.fillRect(15, 0, 15, 40); g.generateTexture('inimigo_furacao', 30, 40);

		g.clear(); g.fillStyle(0xffffff, 0.8); g.fillRoundedRect(0, 0, 20, 40, 10); g.generateTexture('efeito_espada', 20, 40);
		g.clear(); g.fillStyle(0x00ffff, 1); g.fillCircle(8, 8, 8); g.generateTexture('tiro_energia', 16, 16);
	}

	create() {
		this.jogoPausado = false;
		this.isIdleMode = false;
		this.debugAberto = false;

		this.physics.world.drawDebug = false;
		this.physics.world.debugGraphic.clear();

		this.add.rectangle(640, 360, 1280, 720, 0x87CEEB);
		this.camadaFundo = this.add.tileSprite(640, 592, 1280, 128, 'textura_fundo');
		this.camadaChao = this.add.tileSprite(640, 688, 1280, 64, 'textura_chao');
		this.groundCollider = this.add.rectangle(640, 688, 1280, 64, 0x000000, 0);
		this.physics.add.existing(this.groundCollider, true);

		this.player = this.physics.add.sprite(150, 500, 'gralha_correndo_0');
		this.player.setCollideWorldBounds(true);
		this.physics.add.collider(this.player, this.groundCollider);
		
		this.anims.create({ key: 'correndo', frames: [ { key: 'gralha_correndo_0' }, { key: 'gralha_correndo_1' } ], frameRate: 10, repeat: -1 });
		this.anims.create({ key: 'pulando', frames: [ { key: 'gralha_pulando' } ], frameRate: 10 });
		this.player.play('correndo');

		this.cursors = this.input.keyboard.createCursorKeys();
		this.keyEspada = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
		this.keyTiro = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
		this.keyIdle = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);

		this.input.keyboard.on('keydown-L', () => this.abrirLoja());
		this.input.keyboard.on('keydown-ESC', () => this.abrirLoja());
		this.input.keyboard.on('keydown-D', () => this.abrirDebug()); 

		this.hudContainer = this.add.container(0, 0);
		this.hudContainer.setDepth(50);

		let estiloHUD = { fontSize: '20px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 };
		this.txtMoedas = this.add.text(20, 20, `Moedas: ${this.status.moedas}`, estiloHUD);
		this.txtKills = this.add.text(20, 50, `Abates: ${this.status.inimigosMortos}`, estiloHUD);
		this.txtMortes = this.add.text(20, 80, `Mortes: ${this.status.mortes}`, estiloHUD);
		this.txtVida = this.add.text(20, 110, `Vida: ${this.status.hpAtual}/${this.status.hpMaximo}`, { fontSize: '20px', fill: '#ff4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
		this.txtIdle = this.add.text(20, 140, 'MODO IDLE: OFF', { fontSize: '22px', fill: '#aaaaaa', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
		let txtInstrucoes = this.add.text(450, 20, 'CIMA: Pular | Z: Espada | X: Tiro | L/ESC: Loja | I: Idle | D: Debug', { fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 2 });
		
		this.hudContainer.add([this.txtMoedas, this.txtKills, this.txtMortes, this.txtVida, this.txtIdle, txtInstrucoes]);

		this.txtDebugStats = this.add.text(1050, 20, '', { fontSize: '14px', fill: '#00ff00', backgroundColor: '#000', padding: {x: 10, y: 10} });
		this.txtDebugStats.setVisible(false); 
		this.txtDebugStats.setDepth(60);

		this.moedasGroup = this.physics.add.group();
		this.inimigosGroup = this.physics.add.group();
		this.tirosGroup = this.physics.add.group();
		this.physics.add.collider(this.inimigosGroup, this.groundCollider);

		this.hitboxEspada = this.physics.add.sprite(-100, -100, 'efeito_espada');
		this.hitboxEspada.setVisible(false);
		this.hitboxEspada.body.setAllowGravity(false);
		this.isAtacandoEspada = false;
		this.podeAtirar = true;

		this.spawnerMoedas = this.time.addEvent({ delay: 1500, callback: this.gerarMoeda, callbackScope: this, loop: true });
		this.spawnerInimigos = this.time.addEvent({ delay: 3000, callback: this.gerarInimigo, callbackScope: this, loop: true });

		this.physics.add.overlap(this.player, this.moedasGroup, this.coletarMoeda, null, this);
		this.physics.add.overlap(this.player, this.inimigosGroup, this.interacaoPlayerInimigo, null, this);
		this.physics.add.overlap(this.hitboxEspada, this.inimigosGroup, this.danoDeEspada, null, this);
		this.physics.add.overlap(this.tirosGroup, this.inimigosGroup, this.danoDeTiro, null, this);

		this.criarMenuLoja();
		this.criarMenuDebug();
	}

	update() {
		if (this.jogoPausado) return; 

		if (this.txtDebugStats.visible) {
			let fps = this.game.loop.actualFps ? this.game.loop.actualFps.toFixed(1) : 0;
			let qtdInimigos = this.inimigosGroup.countActive(true);
			let qtdMoedas = this.moedasGroup.countActive(true);
			this.txtDebugStats.setText(`[STATS DE DEBUG]\nFPS: ${fps}\nInimigos Ativos: ${qtdInimigos}\nMoedas Ativas: ${qtdMoedas}`);
		}

		if (Phaser.Input.Keyboard.JustDown(this.keyIdle)) {
			this.isIdleMode = !this.isIdleMode;
			this.txtIdle.setText(this.isIdleMode ? 'MODO IDLE: ON' : 'MODO IDLE: OFF');
			this.txtIdle.setColor(this.isIdleMode ? '#00ff00' : '#aaaaaa');
		}

		this.camadaFundo.tilePositionX += this.gameSpeed * 0.3;
		this.camadaChao.tilePositionX += this.gameSpeed;

		let noChao = this.player.body.touching.down;

		if (this.isIdleMode) {
			this.executarBotIA(noChao);
		} else {
			if (this.cursors.up.isDown && noChao) { this.pular(); }
			if (Phaser.Input.Keyboard.JustDown(this.keyEspada) && this.status.temEspada && !this.isAtacandoEspada) { this.atacarEspada(); }
			if (Phaser.Input.Keyboard.JustDown(this.keyTiro) && this.status.temTiro && this.podeAtirar) { this.atirar(); }
		}

		if (noChao && this.player.anims.currentAnim && this.player.anims.currentAnim.key !== 'correndo') { this.player.play('correndo'); }
		if (this.isAtacandoEspada) this.hitboxEspada.setPosition(this.player.x + 35, this.player.y);

		this.moedasGroup.getChildren().forEach(m => { if (m.x < -50) m.destroy(); });
		this.inimigosGroup.getChildren().forEach(i => { if (i.x < -50) i.destroy(); });
		this.tirosGroup.getChildren().forEach(t => { if (t.x > 1350) t.destroy(); });
	}

	// --- PAINEL DE DEBUG ---
	criarMenuDebug() {
		this.debugContainer = this.add.container(640, 360);
		this.debugContainer.setVisible(false); 
		this.debugContainer.setDepth(200); 
		
		// Fundo semitransparente para você conseguir ver o jogo rodando por trás
		this.debugContainer.add(this.add.rectangle(0, 0, 720, 520, 0x550000, 0.8));
		this.debugContainer.add(this.add.text(-330, -230, '🔧 MENU DE DEBUG (Aperte D para Sair)', { fontSize: '22px', fill: '#00ff00', fontStyle: 'bold' }));

		let btnZerar = this.add.text(-330, -170, '> Zerar Jogo (Apagar Save)', { fontSize: '18px', fill: '#ff4444', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnZerar.setInteractive({ useHandCursor: true }); btnZerar.on('pointerdown', () => this.zerarSave());
		this.debugContainer.add(btnZerar);

		let btnColisao = this.add.text(-330, -110, '> Ligar/Desligar Hitboxes', { fontSize: '18px', fill: '#fff', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnColisao.setInteractive({ useHandCursor: true }); btnColisao.on('pointerdown', () => this.toggleCaixasColisao());
		this.debugContainer.add(btnColisao);

		let btnHud = this.add.text(-330, -50, '> Exibir/Esconder HUD', { fontSize: '18px', fill: '#fff', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnHud.setInteractive({ useHandCursor: true }); btnHud.on('pointerdown', () => this.hudContainer.setVisible(!this.hudContainer.visible));
		this.debugContainer.add(btnHud);

		let btnStats = this.add.text(-330, 10, '> Exibir/Esconder Quadro de Stats', { fontSize: '18px', fill: '#fff', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnStats.setInteractive({ useHandCursor: true }); btnStats.on('pointerdown', () => this.txtDebugStats.setVisible(!this.txtDebugStats.visible));
		this.debugContainer.add(btnStats);

		let btnAddMoeda = this.add.text(-330, 70, '> +100 Moedas', { fontSize: '18px', fill: '#ffff00', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnAddMoeda.setInteractive({ useHandCursor: true }); 
		btnAddMoeda.on('pointerdown', () => { this.status.moedas += 100; this.atualizarHUD(); });
		this.debugContainer.add(btnAddMoeda);

		let btnRemMoeda = this.add.text(-150, 70, '> -100 Moedas', { fontSize: '18px', fill: '#ffaa00', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnRemMoeda.setInteractive({ useHandCursor: true }); 
		btnRemMoeda.on('pointerdown', () => { this.status.moedas = Math.max(0, this.status.moedas - 100); this.atualizarHUD(); });
		this.debugContainer.add(btnRemMoeda);

		let btnAddInimigo = this.add.text(-330, 130, '> Forçar Inimigo', { fontSize: '18px', fill: '#00ffff', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnAddInimigo.setInteractive({ useHandCursor: true }); 
		btnAddInimigo.on('pointerdown', () => this.gerarInimigo());
		this.debugContainer.add(btnAddInimigo);

		let btnRemInimigo = this.add.text(-120, 130, '> Limpar Inimigos da Tela', { fontSize: '18px', fill: '#00aaaa', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnRemInimigo.setInteractive({ useHandCursor: true }); 
		btnRemInimigo.on('pointerdown', () => this.inimigosGroup.clear(true, true));
		this.debugContainer.add(btnRemInimigo);

		let btnAddMoedaTela = this.add.text(-330, 190, '> Forçar Moeda', { fontSize: '18px', fill: '#ff66ff', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnAddMoedaTela.setInteractive({ useHandCursor: true }); 
		btnAddMoedaTela.on('pointerdown', () => this.gerarMoeda());
		this.debugContainer.add(btnAddMoedaTela);

		let btnRemMoedaTela = this.add.text(-130, 190, '> Limpar Moedas da Tela', { fontSize: '18px', fill: '#ff00aa', backgroundColor: '#222', padding: { x: 10, y: 10 } });
		btnRemMoedaTela.setInteractive({ useHandCursor: true }); 
		btnRemMoedaTela.on('pointerdown', () => this.moedasGroup.clear(true, true));
		this.debugContainer.add(btnRemMoedaTela);
	}

	abrirDebug() {
		if (this.lojaContainer.visible) return; 
		
		this.debugAberto = !this.debugAberto;
		this.debugContainer.setVisible(this.debugAberto);
		
		// O jogo não é mais pausado aqui! A física e os temporizadores continuam rodando livremente.
	}

	zerarSave() {
		sessionStorage.removeItem('gralha_save');
		this.scene.restart(); 
	}

	toggleCaixasColisao() {
		if (this.physics.world.drawDebug) {
			this.physics.world.drawDebug = false;
			this.physics.world.debugGraphic.clear();
		} else {
			this.physics.world.drawDebug = true;
		}
	}

	// --- INTELIGÊNCIA ARTIFICIAL E LÓGICA DE JOGO ---
	executarBotIA(noChao) {
		let inimigoProximo = null;
		let distInimigo = 9999;

		this.inimigosGroup.getChildren().forEach(inimigo => {
			if (inimigo.x > this.player.x) {
				let dist = inimigo.x - this.player.x;
				if (dist < distInimigo) { distInimigo = dist; inimigoProximo = inimigo; }
			}
		});

		let moedaProximaAlto = null;
		let distMoeda = 9999;
		this.moedasGroup.getChildren().forEach(moeda => {
			if (moeda.x > this.player.x && moeda.y < 550) { 
				let dist = moeda.x - this.player.x;
				if (dist < distMoeda) { distMoeda = dist; moedaProximaAlto = moeda; }
			}
		});

		if (inimigoProximo && distInimigo < 600) {
			if (this.status.temTiro && distInimigo < 450 && this.podeAtirar) { this.atirar(); } 
			else if (this.status.temEspada && distInimigo < 80 && !this.isAtacandoEspada) { this.atacarEspada(); } 
			else if (distInimigo < 150 && noChao) { this.pular(); }
		} 
		else if (moedaProximaAlto && distMoeda < 150 && noChao) {
			this.pular();
		}
	}

	pular() { this.player.setVelocityY(-600); this.player.play('pulando'); }
	atacarEspada() { this.isAtacandoEspada = true; this.hitboxEspada.setVisible(true); this.time.delayedCall(200, () => { this.isAtacandoEspada = false; this.hitboxEspada.setVisible(false); this.hitboxEspada.setPosition(-100, -100); }); }
	atirar() { this.podeAtirar = false; let t = this.tirosGroup.create(this.player.x + 20, this.player.y, 'tiro_energia'); t.body.setAllowGravity(false); t.setVelocityX(600); this.time.delayedCall(500, () => { this.podeAtirar = true; }); }

	interacaoPlayerInimigo(player, inimigo) {
		let caindo = player.body.velocity.y > 0;
		let emCima = player.y < (inimigo.y - 15);

		if (caindo && emCima) {
			let x = inimigo.x, y = inimigo.y; 
			inimigo.destroy(); player.setVelocityY(-400); this.registrarAbate(x, y);
		} else {
			inimigo.destroy(); this.cameras.main.shake(150, 0.01);
			player.setTint(0xff0000); this.time.delayedCall(300, () => { player.clearTint(); });

			this.status.hpAtual -= 1; this.atualizarHUD();
			if (this.status.hpAtual <= 0) { this.morrerEReiniciar(); }
		}
	}

	danoDeEspada(hitbox, inimigo) { if (this.isAtacandoEspada) { let x = inimigo.x, y = inimigo.y; inimigo.destroy(); this.registrarAbate(x, y); } }
	danoDeTiro(tiro, inimigo) { let x = inimigo.x, y = inimigo.y; tiro.destroy(); inimigo.destroy(); this.registrarAbate(x, y); }

	registrarAbate(x, y) { 
		this.status.inimigosMortos += 1; 
		let moedasDropadas = Phaser.Math.Between(1, 3) + (this.status.nivelMoedasInimigo * 2);
		this.status.moedas += moedasDropadas; 
		this.mostrarTextoFlutuante(x, y, `+${moedasDropadas}`, '#ffff00');
		this.atualizarHUD(); 
	}

	mostrarTextoFlutuante(x, y, texto, cor) {
		let txt = this.add.text(x, y, texto, { fontSize: '22px', fill: cor, fontStyle: 'bold', stroke: '#000', strokeThickness: 4 });
		this.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
	}

	morrerEReiniciar() {
		this.status.mortes += 1; this.status.hpAtual = this.status.hpMaximo; this.salvarJogo();
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.restart(); });
	}

	// --- LOJA CENTRALIZADA ---
	criarMenuLoja() {
		this.lojaContainer = this.add.container(640, 360); 
		this.lojaContainer.setVisible(false); this.lojaContainer.setDepth(100);
		this.lojaContainer.add(this.add.rectangle(0, 0, 600, 450, 0x000000, 0.9));
		this.lojaContainer.add(this.add.text(-250, -200, 'LOJA DE MELHORIAS (Aperte L/ESC para Sair)', { fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold' }));

		this.btnEspada = this.add.text(-250, -120, '', { fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 10 } });
		this.btnEspada.setInteractive({ useHandCursor: true }); this.btnEspada.on('pointerdown', () => this.comprarItem('espada')); this.lojaContainer.add(this.btnEspada);

		this.btnTiro = this.add.text(-250, -50, '', { fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 10 } });
		this.btnTiro.setInteractive({ useHandCursor: true }); this.btnTiro.on('pointerdown', () => this.comprarItem('tiro')); this.lojaContainer.add(this.btnTiro);

		this.btnVida = this.add.text(-250, 20, '', { fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 10 } });
		this.btnVida.setInteractive({ useHandCursor: true }); this.btnVida.on('pointerdown', () => this.comprarItem('vida')); this.lojaContainer.add(this.btnVida);

		this.btnMaisMoedas = this.add.text(-250, 90, '', { fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 10 } });
		this.btnMaisMoedas.setInteractive({ useHandCursor: true }); this.btnMaisMoedas.on('pointerdown', () => this.comprarItem('mais_moedas')); this.lojaContainer.add(this.btnMaisMoedas);

		this.atualizarTextosLoja();
	}

	abrirLoja() {
		if (this.debugAberto) return; 

		this.jogoPausado = !this.jogoPausado; this.lojaContainer.setVisible(this.jogoPausado);
		if (this.jogoPausado) {
			this.physics.pause(); this.spawnerMoedas.paused = true; this.spawnerInimigos.paused = true; this.atualizarTextosLoja();
		} else {
			this.physics.resume(); this.spawnerMoedas.paused = false; this.spawnerInimigos.paused = false;
		}
	}

	getCustoMoedasInimigo() { return 20 + (this.status.nivelMoedasInimigo * 20); }

	comprarItem(item) {
		let custo = 0;
		if (item === 'espada' && !this.status.temEspada) custo = 20;
		else if (item === 'tiro' && !this.status.temTiro) custo = 50;
		else if (item === 'vida') custo = 30; 
		else if (item === 'mais_moedas') custo = this.getCustoMoedasInimigo();

		if (custo > 0 && this.status.moedas >= custo) {
			this.status.moedas -= custo;
			if (item === 'espada') this.status.temEspada = true;
			if (item === 'tiro') this.status.temTiro = true;
			if (item === 'vida') { this.status.hpMaximo += 1; this.status.hpAtual = this.status.hpMaximo; }
			if (item === 'mais_moedas') this.status.nivelMoedasInimigo += 1;
			
			this.salvarJogo(); this.atualizarHUD(); this.atualizarTextosLoja();
		} else if (custo > 0) { this.cameras.main.shake(100, 0.005); }
	}

	atualizarTextosLoja() {
		this.btnEspada.setText(this.status.temEspada ? '[COMPRADO] Habilidade: Espada' : 'Comprar Espada (20 Moedas)');
		this.btnTiro.setText(this.status.temTiro ? '[COMPRADO] Habilidade: Tiro' : 'Comprar Tiro de Energia (50 Moedas)');
		this.btnVida.setText('Comprar +1 Vida Maxima (30 Moedas)');
		this.btnMaisMoedas.setText(`Melhorar Drops do Inimigo Lvl ${this.status.nivelMoedasInimigo} (${this.getCustoMoedasInimigo()} Moedas)`);
	}

	// --- UTILITÁRIOS E SPAWN ---
	gerarMoeda() { let a = Phaser.Math.Between(0, 1) === 0 ? 640 : 470; let m = this.moedasGroup.create(1350, a, 'moeda'); m.body.setAllowGravity(false); m.setVelocityX(-this.gameSpeed * 60); }
	gerarInimigo() { const t = ['inimigo_teco', 'inimigo_vovo', 'inimigo_furacao']; let i = this.inimigosGroup.create(1350, 600, Phaser.Math.RND.pick(t)); i.setVelocityX((-this.gameSpeed * 60) - 50); this.spawnerInimigos.delay = Phaser.Math.Between(2000, 4500); }
	coletarMoeda(player, moeda) { moeda.destroy(); this.status.moedas += 1; this.atualizarHUD(); }
	
	atualizarHUD() {
		this.txtMoedas.setText(`Moedas: ${this.status.moedas}`); this.txtKills.setText(`Abates: ${this.status.inimigosMortos}`);
		this.txtMortes.setText(`Mortes: ${this.status.mortes}`); this.txtVida.setText(`Vida: ${this.status.hpAtual}/${this.status.hpMaximo}`);
		this.salvarJogo();
	}
	salvarJogo() { sessionStorage.setItem('gralha_save', JSON.stringify(this.status)); }
}