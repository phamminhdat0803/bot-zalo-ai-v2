# updateLabels

URL: https://zca-js.tdung.com/vi/apis/updateLabels.html

# updateLabels

## api.updateLabels(payload)

### Parameters

*   payload `UpdateLabelsPayload`

### Return

`Promise<UpdateLabelsResponse>`

### Types

ts
```ts
export type UpdateLabelsPayload = {
    labelData: LabelData[];
    version: number;
};

export type UpdateLabelsResponse = {
    labelData: LabelData[];
    version: number;
    lastUpdateTime: number;
};
```

### Examples

ts
```ts
const labels = await api.getLabels();

const updatedLabelData = [...labels.labelData];
updatedLabelData[0].text = "Updated Label";

api.updateLabels({
    labelData: updatedLabelData,
    version: labels.version + 1,
})
    .then(console.log)
    .catch(console.error);
```

### Related

*   [LabelData](./../models/Label.html)