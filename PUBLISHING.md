# Publishing to Open VSX (Free Alternative)

[Open VSX](https://open-vsx.org/) is the popular, open-source alternative to the official Microsoft Marketplace. It does not require a credit card or Microsoft Azure account to publish!

## 1. Prerequisites

1. **Node.js** installed on your machine.
2. **`ovsx`** CLI installed globally.

Install `ovsx` by running:
```bash
npm install -g ovsx
```

## 2. Create a Namespace and Token

1. Go to [open-vsx.org](https://open-vsx.org/) and sign in with your GitHub account.
2. Once signed in, go to your **Settings** (click your avatar -> Settings).
3. Create a new **Access Token** and copy it to a safe place.
4. Go to the **Namespaces** tab from your dashboard and click **Create Namespace**. The name must match the `"publisher"` field in our `package.json` (`yohaankhan`). This verifies you as the owner of this extension name.

## 3. Publish the Extension

Open your terminal in the `trycheat` folder and publish the extension in one command, passing your access token:

```bash
ovsx publish -p YOUR_ACCESS_TOKEN_HERE
```

### Notes
- If you'd rather package the extension without publishing, you can run `npx @vscode/vsce package` to create a `.vsix` file to manually share with your friends.
- You can upload an `"icon": "icon.png"` in your `package.json` to make it stand out more in the registry.
