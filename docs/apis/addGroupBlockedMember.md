# addGroupBlockedMember

URL: https://zca-js.tdung.com/vi/apis/addGroupBlockedMember.html

# addGroupBlockedMember

## api.addGroupBlockedMember(memberId, groupId)

### Parameters

*   memberId `string` | `string[]`
*   groupId `string`

### Return

`Promise<AddGroupBlockedMemberResponse>`

### Types

ts
```ts
export type AddGroupBlockedMemberResponse = "";
```

### Examples

ts
```ts
const memberId = "0000000000000000001";
const groupId = "0000000000000000000";

await api.addGroupBlockedMember(memberId, groupId);
```