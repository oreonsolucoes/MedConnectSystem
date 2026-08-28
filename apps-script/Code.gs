/*************************************************************************
 *  MedConnect — Receptor de Upload para o Google Drive
 *  -------------------------------------------------------------------
 *  Estrutura criada automaticamente no Drive:
 *
 *  📁 [Sua pasta raiz - PASTA_RAIZ_ID]
 *    └── 📁 Dra Priscila Betoni - 04-04-2026
 *          ├── 📁 entrega
 *          │     ├── foto1.jpg
 *          │     └── video.mp4
 *          └── 📁 retirada
 *                └── foto2.jpg
 *
 *  O nome da pasta (cliente + data) é montado no app do motorista e
 *  enviado no campo "pasta" do payload. Este script apenas recebe e
 *  organiza — não precisa saber de datas ou clientes diretamente.
 *
 *  COMO PUBLICAR:
 *   1. Acesse https://script.google.com  →  Novo projeto
 *   2. Apague o conteúdo padrão e cole TODO este arquivo
 *   3. Em PASTA_RAIZ_ID, coloque o ID da pasta do seu Drive.
 *      O ID está na URL da pasta:
 *      https://drive.google.com/drive/folders/ESTE_TRECHO_É_O_ID
 *   4. Menu: Implantar → Nova implantação
 *        - Tipo:            App da Web
 *        - Executar como:   Eu (sua conta)
 *        - Quem tem acesso: Qualquer pessoa
 *   5. Autorize as permissões quando solicitado
 *   6. Copie a "URL do app da Web" e cole em js/modules/drive-upload.js
 *
 *  ATENÇÃO: a cada edição do código, crie uma NOVA implantação
 *  (não edite a existente) e atualize a URL no drive-upload.js.
 *************************************************************************/

// ⬇️  TROQUE pelo ID da pasta raiz do seu Drive
var PASTA_RAIZ_ID = "COLE_AQUI_O_ID_DA_PASTA";

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);

    // Decodifica o arquivo enviado em base64
    var bytes = Utilities.base64Decode(dados.arquivo);
    var blob  = Utilities.newBlob(bytes, dados.mimeType, dados.nome);

    // Localiza (ou cria) a subpasta da locação: "Cliente - locId"
    var raiz = DriveApp.getFolderById(PASTA_RAIZ_ID);
    var subPasta = obterOuCriarPasta(raiz, dados.pasta || "Sem nome");

    // (Opcional) organiza por fase: entrega / retirada
    if (dados.fase) {
      subPasta = obterOuCriarPasta(subPasta, dados.fase);
    }

    var arquivo = subPasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return responder({ ok: true, url: arquivo.getUrl(), id: arquivo.getId() });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}

function doGet() {
  // Teste rápido no navegador
  return responder({ ok: true, msg: "MedConnect Drive Receiver ativo." });
}

function obterOuCriarPasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
