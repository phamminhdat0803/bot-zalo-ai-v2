# getLabels

URL: https://zca-js.tdung.com/vi/apis/getLabels.html

# getLabels

## api.getLabels()

### Parameters

### Return

`Promise<GetLabelsResponse>`

### Types

ts
```ts
export type GetLabelsResponse = {
    labelData: LabelData[];
    version: number;
    lastUpdateTime: number;
}
```

### Examples

ts
```ts
api.getLabels()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [LabelData](./../models/Label.html)