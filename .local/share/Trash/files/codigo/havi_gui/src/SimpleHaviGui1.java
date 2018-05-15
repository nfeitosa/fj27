import java.awt.Color;
import java.awt.Font;
import java.awt.Rectangle;

import javax.tv.xlet.Xlet;
import javax.tv.xlet.XletContext;
import javax.tv.xlet.XletStateChangeException;

import org.havi.ui.HGraphicsDevice;
import org.havi.ui.HScene;
import org.havi.ui.HSceneFactory;
import org.havi.ui.HScreen;
import org.havi.ui.HTextButton;

/**
 * @author Daniel Uchoa
 *
 */
public class SimpleHaviGui1 implements Xlet {
	
	private XletContext context;
	private HScene hscene;
	HTextButton htextButton;	
	
	public SimpleHaviGui1() {
		
	}
	
	public void initXlet( XletContext ctx ) throws XletStateChangeException {
		
		this.context = ctx;

	}
	
	public void startXlet() throws XletStateChangeException {
		
		/* Criação da interface gráfica */
		
		/* Passo 1: Criando uma cena 
		 * 
		 * Para que o middleware se certifique que HScene satisfaça quaisquer
		 * restrições que precisem ser aplicadas à cena, a classe
		 * org.havi.ui.HSceneFactory cria o HScene para nós.
		 * A utilização desta fábrica permite ao middleware assegurar que 
		 * os requisitos do HScene obtido estejam o mais próximo possível
		 * do recurso desejado.
		 *  
		 */
		
		// obtendo referência para a instância única da fábrica de HScene.
		HSceneFactory hsceneFactory = HSceneFactory.getInstance();
		
		// obtendo uma referência para a tela HScreen desejada (a padrão, 
		// neste caso), e dela obtendo o dispositivo da tela no qual nossa
		// aplicação poderá se apresentar.
		HGraphicsDevice hgraphicsDevice = 
			HScreen.getDefaultHScreen().getDefaultHGraphicsDevice();

		// criando um HScene de tela cheia no dispositivo gráfico.
		hscene = hsceneFactory.getFullScreenScene( hgraphicsDevice );
        
		/* Passo 2: Criando um elemento gráfico */
		
		// cria um botão.
		htextButton = new HTextButton( "Pressione o botão vermelho..." );
        
		// define as dimensões deste botão.
		Rectangle bounds = new Rectangle( 0, 0, 720, 576 ); // <x, y, largura, altura>
		int gap = 50;
		htextButton.setBounds( bounds.x + gap, bounds.y + gap, 
				bounds.width - gap * 2, bounds.height - gap * 2 );
		
		// define a fonte e sua cor, e o plano de fundo
		htextButton.setFont( new Font( "Tiresias", Font.BOLD, 34 ) );
		htextButton.setForeground( new Color( 255, 255, 255 ) );
		htextButton.setBackground( new Color( 255, 0, 0 ) );
		
		
		/* Passo 3: Adicionando um elemento gráfico à cena */
		hscene.add( htextButton );
		
		
		/* Passo 4: Exibindo a cena */		
		
		// fornece um tamanho para a cena, em pixels		
		hscene.setSize( bounds.width, bounds.height );
		
		// torna a cena visível
		hscene.setVisible( true );
	}	

	public void pauseXlet() {
		// TODO Auto-generated method stub

	}	
	
	public void destroyXlet(boolean unconditional)
		throws XletStateChangeException {
		// TODO Auto-generated method stub

	}

}
