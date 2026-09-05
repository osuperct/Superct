# Super CT — publicar nas lojas (Play Store / App Store)

O aplicativo já está configurado com o Capacitor. Ele abre o site publicado
(https://superct.lovable.app) dentro de um app nativo, com ícone próprio.

## 1. Baixar o projeto
No Lovable: menu **GitHub / Export** → clone o repositório no seu computador e rode:

```bash
npm install
```

## 2. Criar as versões nativas

```bash
npx cap add android   # precisa do Android Studio instalado
npx cap add ios       # precisa de um Mac com Xcode
npx cap sync
```

## 3. Ícone e nome
- Nome do app: "Super CT" (em `capacitor.config.ts`).
- Ícones: use as imagens em `public/icon-512.png` no Android Studio
  (Image Asset) e no Xcode (AppIcon).

## 4. Gerar os arquivos de envio

Android:
```bash
npx cap open android
# Build > Generate Signed Bundle / APK > Android App Bundle (.aab)
```

iOS (só no Mac):
```bash
npx cap open ios
# Product > Archive > Distribute App
```

## 5. Enviar
- **Google Play Console** — conta de desenvolvedor: US$ 25 (taxa única). Envie o `.aab`.
- **App Store Connect** — conta Apple Developer: US$ 99/ano. Envie pelo Xcode.

## Observações
- Sempre que o site for atualizado no Lovable, o app mostra a versão nova
  automaticamente (ele carrega o site publicado). Não precisa reenviar às lojas.
- Apple e Google podem recusar apps que sejam apenas um atalho de site.
  O Super CT tem login, área do responsável, documentos e o jogo, o que ajuda,
  mas vale destacar isso na descrição do envio.
