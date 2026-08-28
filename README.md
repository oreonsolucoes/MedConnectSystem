# MedConnect · Sistema de Gestão de Locações de Tecnologia Estética

SPA em **Vanilla JS + HTML5 + CSS3** com **Firebase Firestore**, pronta para hospedar no **GitHub Pages**.

## Recursos

- **Login com perfis (RBAC):** Admin (Vilma) com acesso total; Motorista restrito ao Romaneio e Check-list.
- **Dashboard** com receita, lucro líquido, a receber, despesas e frota.
- **Cadastros:** Clientes (voltagem, espaço, restrições, horário), Motoristas (vínculo Fixo/Avulso/Opção A/B), Fornecedores (sublocação), Equipamentos (série, QR, tecnologia, acessórios).
- **Locações:** cálculo automático de lucro líquido, flag de frota própria vs. sublocada, status de pagamento.
- **Romaneio dinâmico** em tempo real (`onSnapshot`) + **Check-list digital** por tecnologia (Laser CO2 e Qclean fiéis aos documentos do projeto), com **URL do Google Drive** para fotos e **assinatura digital em Canvas**.
- **Financeiro:** despesas fixas/avulsas, margem de lucro por locação, controle de inadimplência.
- Interface responsiva com sidebar recolhível; check-list otimizado para smartphone.

## Rodar localmente

Como usa ES Modules, sirva por HTTP (não abra o arquivo direto):

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

**Acesso demo** (sem Firebase): botões *Admin (Vilma)* / *Motorista* na tela de login.
Contas mock: `admin@medconnect.com` / `admin` · `roni@medconnect.com` / `motorista`.

## App do Motorista (`motorista.html`)

Página **separada e dedicada**, pensada para o celular e para uso leigo — não é a tela do sistema com login de motorista, é um app próprio:

- **Login por PIN** (teclado numérico grande). PINs demo: Roni `1001`, Anderson `1002`, Mikael `1003`, Bruno `1004`, Roseli `1005`.
- **Rotas do dia** em cards grandes, agrupadas por dia, com botão direto para o **Google Maps**.
- **Filtros rápidos:** Hoje, Amanhã, Esta semana, Pendentes, Todas e **escolher data**.
- **Sino de notificações** 🔔: quando o admin adiciona, altera ou remove uma entrega da rota do motorista, o sino mostra o número. Ao abrir o painel lateral, as notificações são marcadas como lidas (o número zera) mas **continuam na lista com data e hora**. Só somem quando a entrega é **concluída** ou **excluída** e o motorista confirma no botão "Ok, entendi".
- **Check-list em tela cheia** com botões touch grandes, alternância Entrega/Retirada, **assinatura do cliente** e **upload de fotos/vídeos direto da galeria ou câmera**.

O app abre em `motorista.html` (há um botão para ele na tela de login do sistema). Ele compartilha os dados com o sistema em tempo real: quando a Vilma cria/edita uma entrega no `index.html`, o app do motorista é atualizado na hora (via Firestore em produção; via `localStorage` sincronizado entre abas no modo demo).

## Upload de fotos/vídeos para o Google Drive

O motorista clica em **Tirar foto / Galeria / Vídeo**, seleciona da galeria do celular e o sistema faz o upload — sem colar link. Como o GitHub Pages é estático e não pode guardar segredos, o upload real é feito por um **Google Apps Script** publicado na sua conta.

Passo a passo:
1. Abra [script.google.com](https://script.google.com) → Novo projeto e cole o conteúdo de `apps-script/Code.gs`.
2. Em `PASTA_RAIZ_ID`, coloque o ID da pasta do seu Drive (o trecho final da URL da pasta).
3. **Implantar → Nova implantação → App da Web** — Executar como: *Eu*; Quem tem acesso: *Qualquer pessoa*. Autorize as permissões.
4. Copie a URL gerada e cole em `js/modules/drive-upload.js`, na constante `DRIVE_WEBAPP_URL`.

Enquanto `DRIVE_WEBAPP_URL` estiver vazio, o app roda em **modo demonstração**: as miniaturas aparecem e o upload é simulado, para você ver a experiência completa. Um aviso amarelo indica esse modo na tela do checklist.

> Observação: para **vídeos grandes**, o Firebase Storage seria mais robusto que o Apps Script. Se um dia quiser trocar, basta substituir a função de upload em `drive-upload.js` — o resto do app não muda.

## Conectar o Firebase

1. Crie o projeto no [console](https://console.firebase.google.com).
2. Ative **Authentication → Email/Senha** e **Firestore Database**.
3. Em `js/firebase-config.js`, cole suas credenciais e mude `USE_FIREBASE = true`.
4. As coleções (`clientes`, `motoristas`, `fornecedores`, `equipamentos`, `locacoes`, `despesas`) seguem o formato de `js/modules/mock-data.js` — use-o para semear os dados iniciais.

## Publicar no GitHub Pages

```bash
git init && git add . && git commit -m "MedConnect inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/medconnect.git
git push -u origin main
```

No repositório: **Settings → Pages → Source: GitHub Actions**. O workflow `.github/workflows/deploy.yml` publica automaticamente. O `404.html` garante o funcionamento do roteamento SPA.

## Estrutura

```
index.html            Shell da SPA (login + sidebar + container)
styles.css            Design system (variáveis CSS, responsivo)
js/firebase-config.js Credenciais Firebase + flag de modo demo
js/app.js             Roteamento, autenticação e RBAC
js/modules/           Store, utils, mock-data e módulos de cada tela
assets/               Logos MedConnect
```
