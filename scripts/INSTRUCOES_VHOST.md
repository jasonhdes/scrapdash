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

## 5. HTTPS (necessário para o OAuth do Mercado Livre)

O `vhost-scrapdash.conf` também inclui um VirtualHost `:443` usando o certificado autoassinado que já vem com o XAMPP (`conf/ssl.crt/server.crt`). Isso é necessário porque a redirect URI cadastrada no DevCenter do Mercado Livre é HTTPS.

Ao acessar `https://scrapdash.local` pela primeira vez, o navegador vai avisar que o certificado não é confiável (é autoassinado, só para dev) — clique em "Avançado" → "Continuar mesmo assim". Isso só precisa ser feito uma vez por navegador.
