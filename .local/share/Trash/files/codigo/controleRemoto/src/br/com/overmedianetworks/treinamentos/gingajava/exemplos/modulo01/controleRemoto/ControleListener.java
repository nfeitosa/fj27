package br.com.overmedianetworks.treinamentos.gingajava.exemplos.modulo01.controleRemoto;

import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;


/**
 * Escutador de eventos do controle remoto. Esta classe mantém
 * apenas a lógica de observar eventos.
 * 
 * @author Daniel da Costa Uchôa - Overmedia Networks
 * 
 * Protegido pela Lei nº 9.610, de 19/02/1998 - Lei de Direitos Autorais
 *
 */
public class ControleListener implements KeyListener {
	
	private ControleXlet xlet;
	
	ControleListener( ControleXlet xlet ){
		this.xlet = xlet;		
	}
	
	
	/* Este método é chamado sempre que ocorre um evento de pressão nas
	 * teclas do controle remoto.
	 * @see java.awt.event.KeyListener#keyPressed(java.awt.event.KeyEvent)
	 */
	public void keyPressed( KeyEvent event ) {		
		
		int keyCode = event.getKeyCode(); // código do evento gerado
		this.xlet.updateHScene( keyCode );		

	}

	/* (non-Javadoc)
	 * @see java.awt.event.KeyListener#keyReleased(java.awt.event.KeyEvent)
	 */
	public void keyReleased(KeyEvent arg0) {
		// TODO Auto-generated method stub

	}

	/* (non-Javadoc)
	 * @see java.awt.event.KeyListener#keyTyped(java.awt.event.KeyEvent)
	 */
	public void keyTyped(KeyEvent arg0) {
		// TODO Auto-generated method stub

	}

}
