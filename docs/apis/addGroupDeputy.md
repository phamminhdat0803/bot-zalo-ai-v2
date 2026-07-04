# addGroupDeputy

URL: https://zca-js.tdung.com/vi/apis/addGroupDeputy.html

# addGroupDeputy

## api.addGroupDeputy(memberId, groupId)

### Parameters

*   memberId `string` | `string[]`
*   groupId `string`

### Return

`Promise<AddGroupDeputyResponse>`

### Types

ts
```ts
export type AddGroupDeputyResponse = "";
```

### Examples

ts
```ts
const memberId = "0000000000000000001";
const groupId = "0000000000000000000";

await api.addGroupDeputy(memberId, groupId);
```