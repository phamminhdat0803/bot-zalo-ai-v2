# getQR

URL: https://zca-js.tdung.com/vi/apis/getQR.html

# getQR

## api.getQR(userId)

### Parameters

*   userId `string` | `string[]`

### Return

`Promise<GetQRResponse>`

### Types

ts
```ts
export type GetQRResponse = {
    [userId: string]: string;
};
```

### Examples

ts
```ts
console.log(api.getQR());
```