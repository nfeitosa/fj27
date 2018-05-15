package br.com.overmedianetworks.treinamentos.gingajava.exemplos.modulo01.meuPrimeiroXlet;
/** Este é o exemplo mais básico de um Xlet.
 * No código está ilustrado o ciclo de vida da aplicação, através da implementação
 * dos métodos da interface Xlet, e a interação com o receptor de TV, através da
 * classe XletContext.
 * 
 * @author Daniel da Costa Uchôa - Overmedia Networks
 * 
 * Protegido pela Lei nº 9.610, de 19/02/1998 - Lei de Direitos Autorais
 * 
 */

// Note que neste caso estamos apenas utilizando o pacote xjavax.tv.xlet.
// Exemplos mais completos deverão importar também de br.org.sbtv.* ou outras APIs
// do Ginga ou do Java.
import javax.tv.xlet.Xlet;
import javax.tv.xlet.XletContext;
import javax.tv.xlet.XletStateChangeException;

// A classe principal de uma aplicação de TV precisa implementar a interface Xlet.
// Caso contrário, o middleware Ginga não poderá executá-la.
public class MeuPrimeiroXlet implements Xlet
{

	// Todo Xlet possui um contexto relacionado. Este será criado pelo middleware
	// Ginga e repassado para dentro do Xlet como um parâmetro do método initXlet().
	private XletContext context;

	// Esta variável armazena o estado atual do Xlet. Torna-se necessária pois 
	// o método startXlet() é chamado tanto para inicializar o Xlet a primeira vez, 
	// quanto para fazer o Xlet retornar de um estado de pausa. Dessa forma, esta
	// variável nos permite saber se estamos iniciando a primeira vez.
	private boolean started;

	/**
	 * Todo Xlet precisa ter um construtor padrão que não recebe argumentos.
	 * Atenção: nenhum outro construtor será chamado.
	 */
	public MeuPrimeiroXlet()
	{
		// Não deve haver nada no construtor.  Qualquer inicialização deve ser
		// feita no método initXlet(), ou no método startXlet() se este for sensível
		// a tempo ou recurso. Dessa forma, o middleware Ginga pode controlar quando
		// a inicialização ocorre de uma forma mais precisa.
	}

	/**
	 * Inicialização do Xlet. O contexto será repassado para este Xlet na chamada deste
	 * método, e uma referência precisa ser guardada caso seja posteriormente necessário.
	 * Este é o lugar onde qualquer inicialização deve ocorrer, a menos que esta tome
	 * muito tempo ou consuma muitos recursos. Se algo ocorrer errado, uma exceção 
	 * XletStateChangeException será lançada para permitir que o sistema de execução
	 * saiba que o Xlet não pode ser inicializado.
	 */
	public void initXlet( XletContext context ) throws XletStateChangeException
	{
		// guarde uma referência para o contexto do Xlet onde este está sendo executado.
		this.context = context;

		// O Xlet ainda não foi "startado" nenhuma vez, então marcamos esta variável
		// como falsa neste momento.
		started = false;

		// Como este é um Xlet simples, apenas imprimiremos uma mensagem na saída de debug.
		System.out.println("O método initXlet() está sendo chamado." );
		System.out.println("O contexto do nosso Xlet é  " + context);

	}

    /**
     * Dispara o Xlet.  Neste ponto o Xlet pode se apresentar na tela e começar a 
     * interação com o usuário, ou fazer qualquer tarefa de computação.  Tais tipos
     * de funções devem ser mantidos em startXlet(), e *NÃO* devem ser feitas em
     * initXlet().
     *
     * Assim como no initXlet(), caso algum problema ocorra este método lança uma
     * exceção XletStateChangeException para informar ao sistema de execução que não
     * pôde começar.
     *
     * OBS: Uma armadilha comum é que o método startXlet() precisa retornar para seu chamador.
     * Isto significa que as funções principais do Xlet precisam ser realizadas em uma
     * outra thread. O método startXlet() deve realmente apenas criar tal thread e
     * dispará-la, e então retornar.
     */
	public void startXlet() throws XletStateChangeException
	{
		// Novamente, apenas imprimimos uma mensagem para a saída de debug para
		// que você perceba que algo está ocorrendo, já que ainda não temos eventos
		// gráficos no Xlet. Neste caso, o que é impresso depende de ser ou não a
		// primeira vez que o Xlet está sendo disparado, ou se está voltando de um
		// estado de pausa.
		
		// já foi disparado alguma vez?
		if ( started ) {
			System.out.println("O método startXlet() está sendo chamado para acordar o Xlet do seu estado de pausa." );
			System.out.println( "Olá novamente, Overmedia!" );
		}
		else {
			System.out.println("O método startXlet() está sendo chamado pela primeira vez." );
			System.out.println( "Olá Overmedia!" );
			
			// configura a variável para dizer que o Xlet já foi disparado uma vez
			started = true;
		}
	}

	/**
	 * Pausa o Xlet. Isto significa que o Xlet deve liberar qualquer recurso escarso
	 * que esteja utilizando, parar quaisquer threads desnecessárias e retirar-se da tela.
	 * 
	 * Ao contrário dos outros métodos, pauseXlet() não pode lançar uma exceção para
	 * indicar algum problema com a mudança de estado.  Quando o Xlet é informado para 
	 * pausar, ele precisa fazer isso.
	 */
	public void pauseXlet()
	{
		// Já que não temos nada para pausar, iremos simular esta pausa
		// imprimindo uma mensagem na saída de debug.
		System.out.println("O método pauseXlet() está sendo chamado. Não é uma boa hora para pausa...");
	}

	/**
	 * Parar o Xlet.  O parâmetro booleano informa ao Xlet que ele tem que obedecer
	 * ao pedido.  Caso o valor do parâmetro seja true, o Xlet precisa terminar, e o
	 * sistema de execução assume que isto foi concluído quando do retorno do método.
	 * Se o valor do parâmetro for false, o Xlet pode solicitar que não seja finalizado
	 * lançando a exceção XletStateChangeException.  Se o middleware Ginga ainda deseja
	 * exterminar o Xlet, ele deve chamar o método destroyXlet() novamente configurando
	 * seu parâmetro como true.
	 */
	public void destroyXlet( boolean unconditional ) throws XletStateChangeException
	{

		if ( unconditional ) {
			// A ordem é terminar, então vamos obedecê-la educadamente e liberar
			// qualquer recurso escarso que estejamos mantendo.
			System.out.println("O método destroyXlet() foi chamado informando ao Xlet que pare incondicionalmente");
			System.out.println("Adeus Overmedia!");
		}
		else {
			// Nos pediram educadamente para morrer, então podemos recusar este pedido se quisermos.
			System.out.println("O método destroyXlet() está sendo chamado pedindo que a aplicação pare, porém nos dando escolha.");
			System.out.println("No entanto, optamos por não parar.");

			// O laçamento de uma XletStateChangeException diz ao middleware Ginga que a
			// aplicação deseja manter sua execução caso seja permitido.
			throw new XletStateChangeException("Por favor, não me mate!");
		}
	}
}