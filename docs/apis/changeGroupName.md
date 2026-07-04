# changeGroupName

URL: https://zca-js.tdung.com/vi/apis/changeGroupName.html

# changeGroupName

## api.changeGroupName(name, groupId)

### Parameters

*   name `string`
*   groupId `string`

### Return

`Promise<ChangeGroupNameResponse>`

### Types

ts
```ts
export type ChangeGroupNameResponse = {
    status: number;
};
```

### Examples

Cập nhật tên nhóm

ts
```ts
api
    .changeGroupName("Tên Mới", "0000000000000000000")
    .then(console.log).catch(console.error);
```