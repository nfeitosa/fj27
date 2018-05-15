
<%@taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE	html>
<html>
<head>
<meta charset="UTF-8">
<title>Cadastro de livros</title>
</head>
<body>
	<c:url value="/products" var="url" />
	<form action="${url}" method="post">
		<div>
			<label for="title">Título</label> <input type="text" name="title"
				id="title" />
		</div>
		<div>
			<label for="description">Descrição</label>
			<textarea rows="10" cols="20" name="description" id="description"></textarea>
		</div>
		<div>
			<label for="numberOfPages">Número de páginas</label> <input
				type="text" name="numberOfPages" id="numberOfPages" />
		</div>
		<div>
			<input type="submit" value="Enviar">
		</div>
	</form>
</body>
</html>