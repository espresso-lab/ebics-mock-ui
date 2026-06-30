# EBICS Mock Bank

Ein leichtgewichtiger, lokaler **EBICS-3.0/H005-Gegenpart** für die Entwicklung des
`abrechnung360-banking`-Service. Spricht serverseitig genug des EBICS-Protokolls, damit
der `org.kopi.ebics`-Client den kompletten Flow lokal durchlaufen kann — ohne echte Bank
(GRENKE/MULTIVIA), ohne Live-Risiko.

## Stack

- **server/** — Node/TypeScript, [Fastify](https://fastify.dev) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (file-based DB). Ein einziger `POST /ebicsweb/ebicsweb`-Endpunkt + eine REST-Admin-API fürs UI.
- **ui/** — React 19 + Vite + Mantine 9, Tabellen durchgehend über [`@espresso-lab/mantine-data-table`](https://www.npmjs.com/package/@espresso-lab/mantine-data-table).
- **shared/** — gemeinsame TypeScript-Typen.

npm-Workspaces, ein `npm install`, ein `npm run dev`.

## Quickstart

```bash
npm install
npm run dev        # Server :8088 + UI (Vite) parallel
```

- Server: <http://localhost:8088/ebicsweb/ebicsweb> (EBICS) + <http://localhost:8088/api/*> (Admin)
- UI: die von Vite ausgegebene URL (Default <http://localhost:5173>)

Einzeln:

```bash
npm run dev:server
npm run dev:ui
npm test           # Server-Tests (Vitest)
npm run build
```

## banking-service anbinden

Eine `EbicsConnection` im banking-service anlegen/zeigen lassen auf:

| Feld | Wert |
|---|---|
| `bankUrl` | `http://localhost:8088/ebicsweb/ebicsweb` |
| `hostId` | `MOCKBANK` (oder beliebig, via `EBICS_HOST_ID`) |
| `partnerId` | frei wählbar (Kunden-ID) |
| `userId` | frei wählbar (Teilnehmer-ID) |

Danach normal **INI → HIA → HPB → HTD** fahren; der Teilnehmer erscheint sofort im UI
unter *Teilnehmer*. `A360_LIVE_MODE` ist irrelevant, es geht nichts an eine echte Bank.

## Was implementiert ist

| Bereich | Order-Typen |
|---|---|
| Versionshandshake | HEV |
| Schlüsselinitialisierung | INI, HIA, HPB |
| Teilnehmer-/Bankdaten | HTD, HAA, HAC, PTK |
| Download | BTD (`EOP/DE/camt.053/ZIP`) |
| Upload | BTU (`SCT/pain.001`, `SDD/pain.008`) |
| Verteilte Unterschrift | HVU, HVD, HVE, HVS |
| Transaktionen | Initialisation / Transfer / Receipt, Segmentierung |

Die Krypto ist echt: RSA-2048, A006 (RSASSA-PSS, Doppel-Hash), E002-Verschlüsselung
(AES-128-CBC-Transaktionsschlüssel + RSAES-PKCS1-v1_5 Key-Transport, Deflate), und die
`AuthSignature` der Antworten (XML-DSig, inklusive C14N über die `authenticate="true"`-Elemente,
RSA-SHA256 mit dem Bank-X002-Schlüssel). Die Mock-Bank generiert ihr Bank-Keypair beim
ersten Start und liefert es per HPB aus. Bei BTU-Uploads wird die bankfachliche
**A006-Signatur (EU/ES)** aus der `SignatureData` (mit dem Transaktionsschlüssel entschlüsselt,
`UserSignatureData`/`OrderSignatureData`) gegen die Auftragsdaten mit dem Client-A006-Schlüssel
verifiziert.

> **Integrationshinweis:** Die ausgehende `AuthSignature` ist korrekt-by-construction und
> per Roundtrip-Test abgesichert (`signature.test.ts`, `integration.test.ts` verifizieren sie
> mit dem über HPB ausgelieferten Bank-X002). Die byte-genaue C14N-Übereinstimmung mit dem
> echten `org.kopi.ebics`-Client (Apache Santuario) ist der einzige Punkt, den nur ein echter
> Lauf gegen den banking-service final bestätigt.

## UI

Alle Listen sind `mantine-data-table` mit Aufklapp-Details:

- **Teilnehmer** — INI/HIA/HPB-Ampel + empfangene Schlüssel-Hashes
- **Konten & Umsätze** — Konten + Buchungen anlegen/bearbeiten/löschen; *camt importieren* lädt echte camt.053-Umsätze hoch; Auswahl → *Auszug erzeugen* baut einen camt.053. Teilnehmer/Aufträge/Auszüge/VEU sind löschbar (zum Aufräumen)
- **Eingereichte Aufträge** — per BTU eingereichte pain.001/008, entschlüsselt + geparst, mit Einzelposten und Roh-pain; die bankfachliche A006-Signatur (ES) wird verifiziert (gültig/ungültig/n.v.)
- **Kontoauszüge** — erzeugte camt.053 (AVAILABLE/FETCHED), Inline-Anzeige
- **VEU / Freigaben** — offene verteilte Unterschriften
- **Kundenprotokoll** — chronologisches HAC-Protokoll
- **Verkehr** — jeder Request/Response als Roh-XML (Debugging)
- **Bank-Schlüssel** — das HPB-Material + PEM

## Konfiguration

| Variable | Default | Zweck |
|---|---|---|
| `PORT` | `8088` | Server-Port |
| `EBICS_HOST_ID` | `MOCKBANK` | Host-ID in HEV/HPB/HTD |
| `EBICS_MOCK_DB` | `./ebics-mock.sqlite` | Pfad der File-DB |
| `EBICS_SEED` | – | `true` seedet ein Demo-Konto + Buchungen beim ersten Start (Default: leer) |
| `EBICS_UI_DIR` | – | Wenn gesetzt, serviert der Server das gebaute UI von dort (Single-Container) |
| `VITE_API_BASE` | `` (relativ) | API-Basis fürs UI; dev nutzt den Vite-Proxy auf `:8088` |

## Schema-Konformität

Alle ausgehenden Nachrichten werden gegen die offiziellen **H005-XSDs**
(`abrechnung360-banking/docs/ebics-schema-templates`) validiert (`xmllint --schema`):
HEV, KeyManagement (INI/HIA/HPB), `ebicsResponse` (Init/Transfer/Receipt) und alle
OrderData-Payloads (HPB/HTD/HAA/HVU/HVD) — **12/12 valide**. Insbesondere H005-spezifisch:
HPB liefert die Bank-Keys als **X509-Zertifikate** (nicht Modulus/Exponent), der INI/HIA-Parser
liest X509 *und* Modulus/Exponent, die Body-`ReturnCode`-Elemente tragen `authenticate="true"`,
und HAA ist eine BTF-`Service`-Liste. Eingehende Requests werden bewusst **tolerant** geparst.

ReturnCodes folgen dem ReturnCodes-Anhang (z. B. `091101 EBICS_TX_UNKNOWN_TXID`,
`090005 EBICS_NO_DOWNLOAD_DATA_AVAILABLE`), ReportText im Format `[NAME] Kurztext`.
BTF-Codes (`EOP/camt.053`, `SCT/pain.001`, `SDD/pain.008`, Scope `DE`, Container `ZIP`)
entsprechen der BTF-ExternalCodeList und den GRENKE-Bankparametern.

## Deployment

Ein Container (Node serviert API + UI), Helm-Chart, GitHub-Action-Release, home-lab via ArgoCD.

**Image + Chart (CI):** `.github/workflows/release.yml` baut das Image nach
`ghcr.io/<owner>/ebics-mock-ui` und pusht das Chart als OCI nach
`ghcr.io/<owner>/ebics-mock-ui/helm` (Version `0.1.<run_number>`).

**home-lab:** `home-lab/apps/ebics.tf` legt eine ArgoCD-Application an, die das Chart auf
`https://ebics.viets.dev` deployt. Das Chart erzeugt **zwei Ingresses**:
- `/` → UI + Admin-API **hinter Pocket ID** (Traefik-Middleware `kube-system-oidc-auth@kubernetescrd`)
- `/ebicsweb` → EBICS-Endpunkt **ohne Auth** (höhere Router-Priorität), damit EBICS-Clients
  ohne Pocket ID durchkommen

cert-manager (`letsencrypt-prod`) stellt das TLS-Zertifikat; die DB liegt auf einem PVC.

> **Prerequisites (einmalig):** ghcr-Image **und** -Chart auf **public** stellen (sonst
> ImagePullBackOff / ArgoCD-Sync-Fehler; dann ist `imagePullSecrets: []` korrekt), und in
> Pocket ID die Redirect-URI `https://ebics.viets.dev/oauth2/callback` zum geteilten
> Traefik-OIDC-Client hinzufügen.

## Lizenz

[MIT](./LICENSE) — © 2026 assetsquare UG (haftungsbeschränkt).

Entstanden als Entwicklungswerkzeug für [abrechnung360.de](https://abrechnung360.de/), eine
cloud-basierte Hausverwaltungssoftware für WEG-, SEV- und Mietverwaltungen: KI-gestützte
Buchhaltung und Belegerkennung, automatischer Dokumenteneingang, EBICS-Direktanbindung mit
täglichem Kontoabruf und SEPA-Lastschrift/-Überweisung, rechtssichere Abrechnungen nach
VDIV 3.0 (Wirtschaftsplan, Vermögensbericht, Rücklagen), Mahnwesen, zentrales CRM und
KI-Objektimport — DSGVO-konform, Server in Deutschland. Diese Mock-Bank dient dazu, die
**EBICS-Direktanbindung** lokal gegen einen Gegenpart zu entwickeln und zu testen.
