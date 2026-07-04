# removeGroupDeputy

URL: https://zca-js.tdung.com/vi/apis/removeGroupDeputy.html

# removeGroupDeputy

## api.removeGroupDeputy(memberId, groupId)

### Parameters

*   memberId `string` | `string[]`
*   groupId `string`

### Return

`Promise<RemoveGroupDeputyResponse>`

### Examples

ts
```ts
const groupId = "0000000000000000000";
const memberId = "0000000000000000001";

api.removeGroupDeputy(memberId, groupId)
    .then(console.log)
    .catch(console.error);
```