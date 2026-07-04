# removeGroupBlockedMember

URL: https://zca-js.tdung.com/vi/apis/removeGroupBlockedMember.html

# removeGroupBlockedMember

## api.memberId(memberId, groupId)

### Parameters

*   memberId `string` | `string[]`
*   groupId `string`

### Return

`Promise<RemoveGroupBlockedMemberResponse>`

### Types

ts
```ts
export type RemoveGroupBlockedMemberResponse = "";
```

### Examples

ts
```ts
const memberId = "000000000000000000";
const groupId = "000000000000000001";

api.removeGroupBlockedMember(memberId, groupId)
    .then(console.log)
    .catch(console.error);
```