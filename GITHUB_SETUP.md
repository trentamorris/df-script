# Connecting a Local Repository to GitHub via SSH

This guide outlines the steps to initialize a local Git repository and connect it to GitHub using SSH authentication.

---

## 1. Local Git Initialization

Run these commands in your project's root folder to initialize Git, stage all files, and make your first commit:

```powershell
# 1. Initialize the git repository
git init

# 2. Add a .gitignore file to exclude temporary files (node_modules, build folders, etc.)
# Then stage and commit all files:
git add .
git commit -m "Initial commit"

# 3. Rename the default branch to main
git branch -M main

# 4. Set the remote to point to your GitHub repository using the SSH URL
git remote add origin git@github.com:<your-github-username>/<your-repository-name>.git
```

---

## 2. Generating a New SSH Key

If you do not already have an SSH key pair on your computer, generate a new one:

```powershell
# Generate the key (press Enter to accept the default path and leave the passphrase empty)
ssh-keygen -t ed25519 -C "<your-email@example.com>"
```

* **Private Key Location**: Saved to `~/.ssh/id_ed25519` (Keep this secret!)
* **Public Key Location**: Saved to `~/.ssh/id_ed25519.pub` (This is the key you will share with GitHub)

---

## 3. Adding the Key to GitHub

1. Copy the public key content to your clipboard:
   * **On Windows (PowerShell)**:
     ```powershell
     Get-Content "$HOME\.ssh\id_ed25519.pub" | Set-Clipboard
     ```
   * **On macOS / Linux (Terminal)**:
     ```bash
     cat ~/.ssh/id_ed25519.pub | pbcopy
     ```
2. Open the [GitHub SSH Settings Page](https://github.com/settings/ssh/new).
3. Set the **Title** to your computer's name (e.g., `Work Laptop` or `Home PC`).
4. Set the **Key type** to `Authentication Key`.
5. Paste the key into the **Key** field.
6. Click **Add SSH key**.

---

## 4. Verifying and Pushing Code to GitHub

Before pushing for the first time, run a quick connection test to add GitHub to your computer's list of trusted hosts:

```powershell
ssh -T -o StrictHostKeyChecking=accept-new git@github.com
```

Now, push your local commits to GitHub:

```powershell
git push -u origin main
```

Subsequent pushes only require:
```powershell
git push
```
