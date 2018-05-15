package br.com.casadocodigo.loja.conf;

import org.springframework.web.servlet.support.AbstractAnnotationConfigDispatcherServletInitializer;

//imports
public class ServletSpringMVC extends AbstractAnnotationConfigDispatcherServletInitializer {
	@Override
	protected Class<?>[] getRootConfigClasses() {
		return null;
	}

	@Override
	protected Class<?>[] getServletConfigClasses() {
		// Tem que colocar aqui para ser adicionado no
		// carregamento da servlet base
		return new Class[] { AppWebConfiguration.class };
	}

	@Override
	protected String[] getServletMappings() {
		return new String[] { "/" };
	}
}