package br.com.overmedianetworks.treinamentos.gingajava.exemplos.modulo01.controleRemoto;

import java.awt.Graphics;
import java.awt.Image;
import java.awt.MediaTracker;
import java.awt.Rectangle;
import java.awt.Toolkit;

import org.havi.ui.HComponent;
import org.havi.ui.HScene;

/** 
 * Componente Overmedia para apresentar o logo no HScene.
 *  
 * @author Daniel da Costa Uchôa - Overmedia Networks
 * 
 * Protegido pela Lei nº 9.610, de 19/02/1998 - Lei de Direitos Autorais
 *
 */

public class OvermediaComponent extends HComponent {
	
	private static final long serialVersionUID = 1L;
	
	private Image image; // imagem a ser carregada no componente
	
	/**
	 * Este método carrega o bitmap que iremos incluir neste componente.
	 */
	public void loadForegroundBitmap() {
		
		// cria um rastreador de mídia para nos informar quando a imagem for carregada
		MediaTracker tracker = new MediaTracker( this );
		
		// carrega a imagem
		image = Toolkit.getDefaultToolkit().getImage( "../resources/foreground.png" );

		// adiciona a imagem no rastreador de mídia...
		tracker.addImage( image, 0 );
		
		// ...e aguarda até que o carregamento seja finalizado
        try{
			tracker.waitForAll();
		}
		catch(InterruptedException e) {
			// ignoramos a exeção
			System.out.println( "Não há muito o que fazer agora..." );
			image = null;
		}

	}
	
	/**
	 * Método paint padrão AWT para redesenhar os conteúdos do componente.
	 */
	public void paint( Graphics graphics ) {

		// Caso a imagem tenha sido carregada, ela é adicionada ao componente.
		if ( image != null) {
			
			// desenha a imagem no buffer
			graphics.drawImage( image, 10, 30, null );
		}
				
	}
	
	/**
	 * Método que configura o logo e adiciona-o à cena.
	 * @param hscene cena criada pelo Xlet.
	 */
	
	public void logoSetUp( HScene scene ){

		// obtendo o tamanho da cena
		Rectangle rect = scene.getBounds();

		// configura o tamanho do nosso logo para que ele caiba na cena,
		// torna o componente visível e configura sua cor de fundo.
		this.setBounds( rect );
		this.setVisible( true );
		
		// adiciona este componente à cena.
		scene.add( this );
	}

}
