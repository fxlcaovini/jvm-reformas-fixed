# JVM Reformas

App mobile em **React Native + Expo + TypeScript + SQLite** para gestão de obras e reformas.

## O que já está implementado

- Dashboard com resumo de obras, alertas e consolidado financeiro
- CRUD base de clientes
- CRUD base de obras
- Controle de etapas por obra com progresso por fase
- Abertura de endereço no Google Maps
- Upload de imagem/vídeo para a obra
- Controle financeiro com entradas, saídas e anexo de nota/documento
- Relatório visual simples de caixa e lucro por obra
- Cadastro de equipe
- Registro de diárias e histórico de pagamentos
- Controle de materiais por obra
- Sugestão de materiais com base no histórico
- Detecção de possíveis compras duplicadas
- Orçamentos com itens detalhados
- Duplicação de orçamento
- Geração de PDF profissional
- Compartilhamento do PDF
- Assinatura digital do cliente
- Banco local SQLite persistente
- Fila local para sincronização futura
- Notificação local para prazo de obra
- Motor inicial de interpretação de comando por voz por texto transcrito

## Observações importantes

Esta entrega foi estruturada como uma base **real e funcional offline-first**, mas há 2 pontos que, para ficarem 100% completos em produção, normalmente exigem infraestrutura adicional:

1. **Sincronização automática em nuvem**
   - A fila local de sincronização já existe.
   - Para sincronizar entre aparelhos, é preciso conectar essa fila a um backend (Supabase, Firebase, API própria etc.).

2. **Entrada por voz com microfone e STT real**
   - O app já possui o parser de comandos de orçamento.
   - Para captar voz do microfone e converter fala em texto de forma robusta, recomendo integrar um módulo nativo/STT dedicado em uma próxima etapa.

## Estrutura de pastas

```text
jvm-reformas/
├── App.tsx
├── app.json
├── package.json
├── README.md
├── src/
│   ├── components/
│   ├── db/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── theme/
│   ├── types/
│   └── utils/
```

## Como rodar

### 1) Criar ambiente

Instale:

- Node.js LTS
- Android Studio (para emulador Android)
- Expo CLI via `npx expo`

### 2) Instalar dependências

Dentro da pasta do projeto:

```bash
npm install
```

Se o Expo apontar divergência de versões, rode:

```bash
npx expo install expo-sqlite expo-image-picker expo-document-picker expo-print expo-sharing expo-file-system expo-linking expo-notifications react-native-webview react-native-maps react-native-safe-area-context react-native-screens react-native-svg
```

### 3) Executar

```bash
npm run start
```

Depois:

- pressione `a` para abrir no Android
- ou escaneie o QR Code no Expo Go

## Build Android

Para gerar build Android mais estável:

```bash
npx expo run:android
```

Ou com EAS:

```bash
npm install -g eas-cli

eas build -p android
```

## Banco de dados

O app usa **SQLite local**. Na primeira execução, ele:

- cria as tabelas
- insere dados de exemplo
- persiste os dados no aparelho

## Próxima evolução recomendada

- Sincronização com Supabase/Firebase
- Login por usuário
- Captura de voz real via STT
- Upload em nuvem de mídia
- OCR de nota fiscal
- Relatórios PDF mais avançados
- Permissões e perfis de acesso

## Fontes técnicas usadas na arquitetura

- O Expo documenta que `expo-sqlite` persiste o banco entre reinicializações e recomenda `openDatabaseAsync`, `runAsync`, `getAllAsync` e `getFirstAsync`. citeturn380574view0
- O Expo documenta que `expo-image-picker` permite selecionar imagens e vídeos da galeria ou câmera. citeturn426352view0
- O Expo documenta `Print.printToFileAsync()` para gerar PDF a partir de HTML. citeturn426352view1
- O Expo documenta `expo-sharing` para compartilhar arquivos com outros apps. citeturn426352view2
- O Expo documenta que notificações locais continuam disponíveis no Expo Go, enquanto push remoto no Android exige development build. citeturn426352view3
- O React Navigation documenta o uso do Bottom Tabs Navigator para navegação por abas. citeturn426352view5
- A documentação de `react-native-maps` no Expo indica suporte em Expo Go para testes. citeturn426352view7
- O repositório `react-native-signature-canvas` informa suporte a Expo e uso para captura de assinatura. citeturn426352view6turn791627view1
- O Expo recomenda usar `npx create-expo-app@latest` sem flag para SDK 54 se o foco for Expo Go em aparelho físico durante a transição atual. citeturn426352view4
