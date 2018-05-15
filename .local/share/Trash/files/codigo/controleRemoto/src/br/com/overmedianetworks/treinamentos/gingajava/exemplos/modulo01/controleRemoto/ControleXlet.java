package br.com.overmedianetworks.treinamentos.gingajava.exemplos.modulo01.controleRemoto;

import java.awt.Color;
import java.awt.Font;

import javax.tv.xlet.Xlet;
import javax.tv.xlet.XletContext;
import javax.tv.xlet.XletStateChangeException;

import org.havi.ui.HScene;
import org.havi.ui.HSceneFactory;
import org.havi.ui.HSceneTemplate;
import org.havi.ui.HScreenDimension;
import org.havi.ui.HScreenPoint;
import org.havi.ui.HState;
import org.havi.ui.HStaticText;
import org.havi.ui.HVisible;


/** 
 * Exemplo de um xlet para controlar ações do controle remoto.
 * O Xlet recebe eventos do controle remoto e atualiza a tela
 * dependendo do evento.
 *  
 * @author Daniel da Costa Uchôa - Overmedia Networks
 * 
 * Protegido pela Lei nº 9.610, de 19/02/1998 - Lei de Direitos Autorais
 *
 */

public class ControleXlet implements Xlet {
	
	private XletContext context;
	private HScene scene;
	private HStaticText htext1, htext2;
	private ControleListener controle;
	private OvermediaComponent logo;
	
	private static final Color COLOR_BLACK = new Color( 0, 0, 0 );
	private static final Color COLOR_WHITE = new Color( 255, 255, 255 );
	private static final Color COLOR_BLUE = new Color( 0, 0, 255 );
	private static final Color COLOR_YELLOW = new Color( 255, 255, 0 );
	private static final Color COLOR_RED = new Color( 255, 0, 0 );
	private static final Color COLOR_GREEN = new Color( 0, 255, 0 );
	
	public ControleXlet() {

		/* Método vazio */

	}

	public void initXlet( XletContext xletContext )
		throws XletStateChangeException {

		// guardando o contexto
		this.context = xletContext;
							
		// criando o escutador de eventos de controle
		this.controle = new ControleListener( this );
		
		// criando componente logo
		this.logo = new OvermediaComponent();
		
		// carrega a imagem do logo no plano gráfico
		logo.loadForegroundBitmap();

	}

	public void startXlet() throws XletStateChangeException {

		/*
		 * Para que o middleware se certifique que HScene satisfaça quaisquer
		 * restrições que precisem ser aplicadas à cena, a classe
		 * org.havi.ui.HSceneFactory cria o HScene para nós.
		 * A utilização desta fábrica permite ao middleware assegurar que 
		 * os requisitos do HScene obtido estejam o mais próximo possível
		 * do recurso desejado.
		 *  
		 */
		
		// obtendo referência para a instância única da fábrica de HScene
		HSceneFactory hsceneFactory = HSceneFactory.getInstance();
		
		// construindo um HSceneTemplate full-screen
		HSceneTemplate hSceneTemplate = new HSceneTemplate();
		HScreenPoint hScreenPoint = new HScreenPoint( (float) 0.0, (float) 0.0 );
		HScreenDimension hScreenDimension = new HScreenDimension( (float) 1.0, (float) 1.0);
		hSceneTemplate.setPreference( HSceneTemplate.SCENE_SCREEN_DIMENSION,
                                 hScreenDimension, HSceneTemplate.REQUIRED );
		hSceneTemplate.setPreference( HSceneTemplate.SCENE_SCREEN_LOCATION,
                                 hScreenPoint, HSceneTemplate.REQUIRED );
		
		// obtendo nosso HScene conforme template
		scene = hsceneFactory.getBestScene( hSceneTemplate );	
		
		// criando uma caixa de texto estática
		htext1 = new HStaticText();
		// posicionamento na tela <x, y, largura, altura>
		htext1.setBounds( 10, 135, 620, 50 ); 
		htext1.setTextContent( "Bem-vindo \u00E0 Overmedia Networks!", 
				HState.ALL_STATES ); // texto por estado
		htext1.setBackground( COLOR_BLACK ); // cor de fundo
		// modo de desenho do fundo
		htext1.setBackgroundMode( HVisible.BACKGROUND_FILL ); 
		// fonte de texto especializada para TV
		htext1.setFont( new Font( "Tiresias", Font.BOLD, 34 )); 
		htext1.setForeground( COLOR_YELLOW ); // cor de fonte
		
		// criando outra caixa de texto
		htext2 = new HStaticText();
		htext2.setBounds( 70, 225, 500, 40 );
		htext2.setTextContent( "Controle Remoto", HState.ALL_STATES );
		htext2.setBackground( COLOR_WHITE );
		htext2.setBackgroundMode( HVisible.BACKGROUND_FILL );
		htext2.setFont( new Font( "Tiresias", Font.BOLD, 32 ) );
		htext2.setForeground( COLOR_BLUE );
				
		/*
		 * Os componetes criados precisam ser adicionados ao contâiner.
		 * O HScene precisa definir sua visibilidade e solicitar o foco.
		 */

		// adicionando componentes à cena
		scene.add( htext1 );
		scene.add( htext2 );
		
		// configura e adiciona logo à cena
		logo.logoSetUp( scene );
		
		scene.validate();
		
		// configurando visibilidade: apresenta ou esconde o HScene
		// dependendo do parâmetro passado
		scene.setVisible( true );
		
		// Solicita foco para recebimento de eventos de entrada.
		// O componente ancestral de mais alto nível se torna a janela em foco.
		scene.requestFocus();
		
		//	adiciona o escutador de controle remoto para receber eventos
		// de teclado a partir deste componente. 
		// (Método herdado de java.awt.Component).
		scene.addKeyListener( controle );

	}


	public void pauseXlet() {

		// não fazemos nada ao pausar...
		
	}

	public void destroyXlet(boolean unconditional)
		throws XletStateChangeException {

		// caso exista instância de HScene...
		if ( scene != null ) {
			scene.setVisible( false ); // retira visibilidade
			scene.removeAll();			// remove todos os componentes
			scene = null;				// objeto perde referência
		}
		
		// notifica destruição ao javax.tv.xlet.XletContext
		context.notifyDestroyed();

	}
	
	/**
	 * Método chamado para atualizar a cena, após um evento de controle remoto.
	 * @param keyCode código de evento de tecla do controle remoto
	 */
	public void updateHScene( int keyCode ) {
		
		StringBuffer text = new StringBuffer();
		String fimDeLinha = "  ";
		Color backgroundColor = COLOR_BLACK; // cor de fundo da caixa de texto
		
		/* TABELA DE CÓDIGOS DO CONTROLE
		 * 
		 * 403 - vermelho
		 * 404 - verde
		 * 405 - amarelo
		 * 406 - azul
		 *
		 * 27 - exit
		 * * (asterisco) - 151
		 * # (grade) - 520
		 *
		 * seta para cima - 38
		 * seta para baixo - 40
		 * seta para esquerda - 37
		 * seta para direita - 39
		 * ok - 10
		 *
		 * números -> número + 48 (ex. 2 é 50)
		 *
		 */

		// A atualização da tela depende do evento gerado pelo controle remoto
		System.out.println( keyCode );
		switch ( keyCode ) {
			case 48:
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 55:
			case 56:
			case 57:
				text.append( "Bot\u00E3o num\u00E9rico: " + ( keyCode - 48 ) + fimDeLinha );
				break;
			case 403:
				text.append( "Bot\u00E3o Vermelho" + fimDeLinha );
				backgroundColor = COLOR_RED;
				break;
			case 404:
				text.append( "Bot\u00E3o Verde" + fimDeLinha );
				backgroundColor = COLOR_GREEN;
				break;
			case 405:
				text.append( "Bot\u00E3o Amarelo" + fimDeLinha );
				backgroundColor = COLOR_YELLOW;
				break;
			case 406:
				text.append( "Bot\u00E3o Azul" + fimDeLinha );
				backgroundColor = COLOR_BLUE;
				break;
			case 27:
				text.append( "Bot\u00E3o EXIT" + fimDeLinha );
				break;
			case 10:
				text.append( "Bot\u00E3o OK" + fimDeLinha );
				break;
			case 151:
				text.append( "Bot\u00E3o Asterisco (*)" + fimDeLinha );
				break;
			case 520:
				text.append( "Bot\u00E3o grade (#)" + fimDeLinha );
				break;
			case 38:
				text.append( "Seta para cima" );
				break;
			case 40:
				text.append( "Seta para baixo" );
				break;
			case 37:
				text.append( "Seta para esquerda" );
				break;
			case 39:
				text.append( "Seta para direita" );
				break;
			case 116:
				text.append( "MENU" );
				backgroundColor = new Color( 130, 255, 130 );
				break;
			case 117:
				text.append( "INFO" );
				backgroundColor = new Color( 100, 180, 255 );
				break;
			default:
				text.append( "Tecla n\u00E3o tratada" + fimDeLinha );
		}
		
		// construindo outro componente de texto
		htext2 = new HStaticText();
		htext2.setBounds( 70, 225, 500, 40 );
		htext2.setTextContent( text.toString(), HState.ALL_STATES );
		htext2.setBackground( backgroundColor );
		htext2.setBackgroundMode( HVisible.BACKGROUND_FILL );
		htext2.setFont( new Font( "Tiresias", Font.BOLD, 32 ) );
		htext2.setForeground( COLOR_WHITE );
		
		// removendo os componentes antigos e adicionando novos
		scene.removeAll();
		scene.add( htext1 );
		scene.add( htext2 );
		scene.add( logo );
		
		// redesenhando a cena
		scene.repaint();

	}
	
}


