---
title: "Using AI to audit OSS, part 1: 14 CVEs"
description: "How a weekend research effort turned into fourteen validated and fixed vulnerabilities"
date: 2026-09-08
readingTime: "6 min"
category: "AI / Vulnerability research"
published: true
socialImage: "/og/using-ai-to-audit-oss-part-1-v2.png"
socialImageAlt: "Using AI to audit OSS, part 1: 14 CVEs"
---

Weeks ago a close friend of mine suggested I take a look at XenForo as a next target. I had previously been tinkering with some Windows antivirus products, namely Avast and Malwarebytes, and have had some success with AI-assisted auditing.

Since the vendors were taking their time to respond, I decided to go look around and find some new targets to improve my "AI methodology".

I used Codex 5.6 models throughout the review for anyone interested in that.

## The very first result

I split XenForo source into sections of logical interest (ex: payments, OAuth, file parsing, etc.) and gave an orchestrator agent the goal to spawn swarms of subagents to each look into their own sections. The main reason for this is that what fills up an agent context seems to be the key difference between finding and skipping a "million dollar bug".

In particular one thing I figured is that the more you can reduce context noise for an agent the more likely it will be to semantically understand what it's looking at.

Given this new methodology the first real bug came through from the OAuth subagent. XenForo checked that `client_secret` and `code_verifier` were present, then only verified them if PHP considered them truthy. An empty string and `"0"` are falsey in PHP, so an empty verifier skipped the PKCE comparison and still returned working access and refresh tokens. I used the access token against `/api/me` just to make sure I had an actual bug and not another AI hallucination ([CVE-2026-73309](/posts/cve-2026-73309/)).

This first finding was fairly quick, less than an hour after I started the orchestrator, which meant my setup could lead to some discoveries.

## The discoveries

Well, they finally came through, and they were mostly absolute BS. More OAuth bugs but also lots of false positives for patterns that look bad but behave normally. This meant I needed to add some way for the agents to verify their findings.

So I instructed the orchestrator to set up a local XenForo instance and the subagents to manipulate said instance however they would need to validate their findings (make accounts, change account permissions, etc.).

This time the subagents were able to self-assert when they started finding false positives, and eventually I had stopped receiving such reports entirely. The report quantity became just a couple a day but every reported bug was 100% real and validated, with a proper PoC and report.

The first one outside OAuth came from payments. A PayPal webhook with a completely made-up algorithm name caused signature verification to be skipped, returned true anyway, and processed my fake payment event. I watched a recurring upgrade gain 30 days from the request ([CVE-2026-73314](/posts/cve-2026-73314/)).

After that came ACP authorization. An admin with only the rebuild-cache permission could make the rebuild endpoint dispatch the approval job as a more privileged user. The approval page itself returned `403`; the rebuild route approved the user anyway ([CVE-2026-73317](/posts/cve-2026-73317/)).

Then the redirect parser accepted a `javascript:` URL because PHP thought its host matched the forum while the browser treated the rest as JavaScript. A logged-in user opening the crafted Follow link and confirming it ran the payload ([CVE-2026-73319](/posts/cve-2026-73319/)).

The funniest one came from file parsing. XenForo caught `../` in style archives and completely ignored the Windows version with backslashes. The uploaded PHP marker escaped the extraction directory, landed in the web root, and executed ([CVE-2026-74239](/posts/cve-2026-74239/)).

## AI can find plenty of bugs if you give it a good environment

The "default" methodology the AI uses is read-n-guess, basically see a possibly vulnerable pattern then make up an exploitation scenario for a bug that doesn't really exist to begin with. The only way I found to avoid such a thing is to be able to have an environment the AI can manipulate as much as needed to validate its findings empirically.

## Putting it all together

Now mix it all up! Spin up an orchestrator and feed it some orchestration skill you made prior (secret juice!) and have subagents be fed a secret subagent skill file which will dictate the exact methodology they need to adhere to. Next instruct orchestrator to set up the environment for runtime validation from the subagents.

Finally have it start its research and wait, eventually if your environment and your skills are good enough you should be able to start finding bugs here and there.

I will be spilling the (skills) secret sauce in the next posts of the series, so stay tuned!

## All found bugs in a weekend

- [CVE-2026-73309: Empty OAuth2 credentials](/posts/cve-2026-73309/) — OAuth authentication · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73309) · [PoC](https://github.com/BomboBombone/CVE-2026-73309)
- [CVE-2026-73310: OAuth redirect URI mismatch](/posts/cve-2026-73310/) — OAuth redirect URI binding · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73310) · [PoC](https://github.com/BomboBombone/CVE-2026-73310)
- [CVE-2026-73311: OAuth authorization code replay](/posts/cve-2026-73311/) — OAuth token replay · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73311) · [PoC](https://github.com/BomboBombone/CVE-2026-73311)
- [CVE-2026-73312: Refresh token replay](/posts/cve-2026-73312/) — OAuth token replay · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73312) · [PoC](https://github.com/BomboBombone/CVE-2026-73312)
- [CVE-2026-73313: Passkey TFA user mismatch](/posts/cve-2026-73313/) — Authentication and authorization · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73313) · [PoC](https://github.com/BomboBombone/CVE-2026-73313)
- [CVE-2026-73314: PayPal signature check bypass](/posts/cve-2026-73314/) — Payment verification · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73314) · [PoC](https://github.com/BomboBombone/CVE-2026-73314)
- [CVE-2026-73315: PayPal certificate URL SSRF](/posts/cve-2026-73315/) — SSRF · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73315) · [PoC](https://github.com/BomboBombone/CVE-2026-73315)
- [CVE-2026-73316: PayPal webhook replay](/posts/cve-2026-73316/) — Payment replay · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73316) · [PoC](https://github.com/BomboBombone/CVE-2026-73316)
- [CVE-2026-73317: ACP rebuild authorization bypass](/posts/cve-2026-73317/) — Authorization · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73317) · [PoC](https://github.com/BomboBombone/CVE-2026-73317)
- [CVE-2026-73318: Agreement reset permissions](/posts/cve-2026-73318/) — Authorization · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73318) · [PoC](https://github.com/BomboBombone/CVE-2026-73318)
- [CVE-2026-73319: JavaScript URI redirect](/posts/cve-2026-73319/) — Cross-site scripting · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73319) · [PoC](https://github.com/BomboBombone/CVE-2026-73319)
- [CVE-2026-73320: Unfurl result disclosure](/posts/cve-2026-73320/) — Information disclosure · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73320) · [PoC](https://github.com/BomboBombone/CVE-2026-73320)
- [CVE-2026-73321: BBCode stack overflow](/posts/cve-2026-73321/) — Denial of service · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-73321) · [PoC](https://github.com/BomboBombone/CVE-2026-73321)
- [CVE-2026-74239: Windows style archive traversal](/posts/cve-2026-74239/) — Path traversal and code execution · [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-74239) · [PoC](https://github.com/BomboBombone/CVE-2026-74239)

## Disclosure

[VulnCheck](https://www.vulncheck.com/vulnerability-disclosure-policy) handled the coordination with XenForo and was fast and helpful throughout the process. XenForo shipped fixed builds for every supported XenForo 2.2 and 2.3 release on 7 September 2026, with XenForo 2.3.13 including all fourteen fixes. XenForo credited me in its [security announcement](https://xenforo.com/community/threads/security-fixes-released-for-all-xenforo-and-media-gallery-versions-2-2-0-2-3-12.239856/), which also lists the affected bug classes. The CVEs were published on 8 September 2026.

## Next

In the next posts I will describe how to set up your environment and skills such that the agents use the best possible methodology that optimizes for context efficiency, which means essentially (to me) to make sure every token of context must be useful for the end goal instead of being some transient information (ex: a command ran to check the current time).

Part 2 will cover my work on MediaWiki, the OSS empowering Wikipedia, Fandom and other major wikis on the web.
