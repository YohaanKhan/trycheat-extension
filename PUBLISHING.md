# Publishing to the VS Code Marketplace

To publish this extension so others can install it directly from VS Code, follow these steps:

## 1. Prerequisites

You need two things before you can publish:
1. **Node.js** installed on your machine.
2. **`vsce`** (Visual Studio Code Extension Manager) CLI installed globally.

Install `vsce` by running:
```bash
npm install -g @vscode/vsce
```

## 2. Create a Publisher

Before you can publish, you need to create a publisher on the Visual Studio Marketplace.

1. Go to the [Azure DevOps portal](https://dev.azure.com/) and create an organization if you don't have one.
2. Go to the [VS Marketplace Management Page](https://marketplace.visualstudio.com/manage) and sign in.
3. Click on **Create publisher** and set your Publisher ID (e.g., `yohaankhan`). This must match the `"publisher"` field in `package.json`.

## 3. Generate a Personal Access Token (PAT)

You need a token to authenticate `vsce` with your Azure DevOps account:

1. In Azure DevOps, go to **User settings** (icon near top right) -> **Personal access tokens**.
2. Click **New Token**.
3. Name it (e.g., "VS Code Extension Publishing").
4. Under **Organizations**, select `All accessible organizations`.
5. Under **Scopes**, scroll down and check **Marketplace** > **Acquire** and **Manage**.
6. Click **Create** and **save the token** securely. You will not see it again.

## 4. Login with `vsce`

Open your terminal in the `trycheat` folder and login using `vsce`:

```bash
vsce login <YOUR_PUBLISHER_ID>
```
When prompted, paste the Personal Access Token (PAT) you generated.

## 5. Publish the Extension

Once logged in, package and publish the extension in one command:

```bash
vsce publish
```

### Notes
- Ensure your `README.md` is descriptive as it will be the main page of your extension on the Marketplace.
- If you'd rather verify the package before publishing, you can run `vsce package`. This will create a `.vsix` file which you can manually install in VS Code to test the production build.
- You can upload an `"icon": "icon.png"` in your `package.json` for a better marketplace presence.
