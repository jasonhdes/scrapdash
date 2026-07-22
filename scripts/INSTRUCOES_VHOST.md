# Configurar domínio local scrapdash.local

Estes dois passos exigem privilégios de administrador, então precisam ser feitos por você.

## 1. VirtualHost do Apache

Copie o conteúdo de `scripts/vhost-scrapdash.conf` para o final de:

```
C:\xampp\apache\conf\extra\httpd-vhosts.conf
```

## 2. Arquivo hosts do Windows

Abra o Notepad **como administrador** e edite:

```
C:\Windows\System32\drivers\etc\hosts
```

Adicione a linha:

```
127.0.0.1 scrapdash.local
```

## 3. Reiniciar o Apache

No painel de controle do XAMPP, clique em "Stop" e depois "Start" no Apache (ou reinicie o serviço).

## 4. Testar

Acesse `http://scrapdash.local` no navegador — deve exibir a página padrão do Laravel.
