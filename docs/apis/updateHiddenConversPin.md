# updateHiddenConversPin

URL: https://zca-js.tdung.com/vi/apis/updateHiddenConversPin.html

# updateHiddenConversPin

## api.updateHiddenConversPin(pin)

### Parameters

*   pin `string`

### Return

`Promise<UpdateHiddenConversPinResponse>`

### Types

ts
```ts
export type UpdateHiddenConversPinResponse = "";
```

### Examples

ts
```ts
api
    .updateHiddenConversPin("9999")
    .then(console.log)
    .catch(console.error);
```