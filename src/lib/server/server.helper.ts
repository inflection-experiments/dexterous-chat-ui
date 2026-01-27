import * as mimeType from 'mime-types';

export class ServerHelper {
    
    static toBase64 = async (file): Promise<string | ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    static dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    // static downloadAsInlineObjectUrl = (response) => {
    //     return Helper.dataURLtoBlob(response.Data.Buffer);
    // };

    static getFileExtensionFromMimeType = (mimeType) => {
        const parts = mimeType.split('/');
        return parts.pop();
    };

    static getMimeTypeFromFileName = (fileName) => {
        return mimeType.lookup(fileName);
    };

    static GetFileBlobUsingURL = (url, convertBlob) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.addEventListener('load', function () {
            convertBlob(xhr.response);
        });
        xhr.send();
    };

    static blobToFile = function (blob, name) {
        blob.lastModifiedDate = new Date();
        blob.name = name;
        return blob;
    };
}
