# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img "Eraclitea" [ref=e5]
        - paragraph [ref=e6]: Portale
        - heading "Accedi al portale" [level=1] [ref=e7]
      - paragraph [ref=e8]: Inserisci le credenziali fornite dall'ente di formazione.
      - generic [ref=e9]:
        - generic [ref=e10]:
          - text: Email
          - textbox "Email" [ref=e11]: mario@acme.it
        - generic [ref=e12]:
          - text: Password
          - textbox "Password" [ref=e13]: cliente123
        - button "Accesso in corso..." [disabled] [ref=e14]
        - link "Hai dimenticato la password?" [ref=e15] [cursor=pointer]:
          - /url: /recupera-password
  - region "Notifications alt+T"
  - alert [ref=e16]
  - generic [ref=e19] [cursor=pointer]:
    - img [ref=e20]
    - generic [ref=e24]: 1 error
    - button "Hide Errors" [ref=e25]:
      - img [ref=e26]
```