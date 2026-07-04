# updateProductCatalog

URL: https://zca-js.tdung.com/vi/apis/updateProductCatalog.html

# updateProductCatalog

## api.updateProductCatalog(payload)

### Parameters

*   payload `UpdateProductCatalogPayload`

### Return

`Promise<UpdateProductCatalogResponse>`

### Types

ts
```ts
export type UpdateProductCatalogPayload = {
    catalogId: string;

    productId: string;
    productName: string;
    price: string;
    description: string;
    createTime: number;

    /**
     * Tối đa 5 tệp, bỏ qua nếu dùng product_photos
     */
    files?: AttachmentSource[];
    /**
     * Danh sách URL ảnh sản phẩm, tối đa 5
     *
     * Có thể lấy URL tệp thủ công với api `uploadProductPhoto`
     */
    product_photos?: string[];
};

export type UpdateProductCatalogResponse = {
    item: ProductCatalogItem;
    version_ls_catalog: number;
    version_catalog: number;
};
```

### Examples

ts
```ts
api
    .updateProductCatalog({
        catalogId: "catelog_id",
        productId: "product_id",
        productName: "Sản phẩm mới",
        price: "500000",
        description: "Đây là sản phẩm mới",
        files: [
            "./san_pham_moi1.jpg",
            "./san_pham_moi2.jpg"
        ]
    })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [AttachmentSource](./../models/Attachment.html)
*   [ProductCatalogItem](./../models/ProductCatalog.html)