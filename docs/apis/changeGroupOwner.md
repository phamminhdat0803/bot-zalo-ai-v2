# changeGroupOwner

URL: https://zca-js.tdung.com/vi/apis/changeGroupOwner.html

# changeGroupOwner

## api.changeGroupOwner(memberId, groupId)

### Parameters

*   memberId `string`
*   groupId `string`

### Return

`Promise<ChangeGroupOwnerResponse>`

### Types

ts
```ts
export type ChangeGroupOwnerResponse = {
    time: number;
};
```

### Examples

Thay chủ nhóm

ts
```ts
const memberId = "0000000000000000001";
const groupId = "0000000000000000000";

api
    .changeGroupOwner(memberId, groupId)
    .then(console.log).catch(console.error);
```