# updateLang

URL: https://zca-js.tdung.com/vi/apis/updateLang.html

# updateLang

## api.updateLang(language)

### Parameters

*   language `UpdateLangAvailableLanguages`
    *   mặc định `UpdateLangAvailableLanguages.VI`

### Return

`Promise<UpdateLangResponse>`

### Types

ts
```ts
export enum UpdateLangAvailableLanguages {
    VI = "VI",
    EN = "EN",
    MY = "MY",
}

export type UpdateLangResponse = "";
```

### Examples

ts
```ts
import { UpdateLangAvailableLanguages } from "zca-js";

api.updateLang(UpdateLangAvailableLanguages.EN)
    .then(console.log)
    .catch(console.error);
```