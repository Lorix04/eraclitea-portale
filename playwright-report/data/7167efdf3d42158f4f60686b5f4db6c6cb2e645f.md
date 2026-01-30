# Page snapshot

```yaml
- generic [ref=e1]:
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
          - textbox "Email" [active] [ref=e11]
        - generic [ref=e12]:
          - text: Password
          - textbox "Password" [ref=e13]: wrongpassword
        - button "Accedi" [ref=e14] [cursor=pointer]
        - link "Hai dimenticato la password?" [ref=e15]:
          - /url: /recupera-password
  - region "Notifications alt+T"
  - alert [ref=e16]
```