# Connecting FrameScript to GitHub via SSH

This guide documents the steps taken to initialize this local repository and connect it to GitHub using SSH authentication.

---

## 1. Local Git Initialization

First, we initialized the Git repository locally, created a basic `.gitignore`, staged the files, and made the initial commit.

```powershell
# 1. Initialize the git repository
git init

# 2. Add and commit all files
git add .
git commit -m "Initial commit: Add v1.0.0 and v1.1.0 codebase"

# 3. Rename default branch to main
git branch -M main

# 4. Set the remote to point to the GitHub SSH URL
git remote add origin git@github.com:trentamorris/FrameScript.git
```

---

## 2. Generating a New SSH Key

We generated a modern `ed25519` SSH key pair to secure the connection:

```powershell
# Generate the key (press Enter to accept default path and leave passphrase empty)
ssh-keygen -t ed25519 -C "trent.morristx@gmail.com"
```

* **Private Key Location**: `C:\Users\Ford\.ssh\id_ed25519` (Keep this secret!)
* **Public Key Location**: `C:\Users\Ford\.ssh\id_ed25519.pub` (Share this with GitHub)

---

## 3. Adding the Key to GitHub

1. Copy the public key content to the clipboard:
   ```powershell
   Get-Content "$HOME\.ssh\id_ed25519.pub" | Set-Clipboard
   ```
2. Open the [GitHub SSH Settings Page](https://github.com/settings/ssh/new).
3. Set the **Title** to your computer identifier (e.g., `Legion Laptop (LAPTOP-GSQC2TAM)`).
4. Set the **Key type** to `Authentication Key`.
5. Paste the key (`Ctrl + V`) into the **Key** field.
6. Click **Add SSH key**.

---

## 4. Pushing Code to GitHub

Once the key is added, run this command to push your local repository to GitHub for the first time:

```powershell
git push -u origin main
```

Subsequent pushes only require:
```powershell
git push
```
