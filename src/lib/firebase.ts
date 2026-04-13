import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, type StorageReference, type UploadTask } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let storage: ReturnType<typeof getStorage>;

function getFirebaseApp(): FirebaseApp {
    if (!app) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    }
    return app;
}

function getFirebaseStorage() {
    if (!storage) {
        storage = getStorage(getFirebaseApp());
    }
    return storage;
}

export interface UploadResult {
    url: string;
    fileName: string;
    fileType: string;
    size: number;
}

export interface UploadProgress {
    progress: number;
    bytesTransferred: number;
    totalBytes: number;
    status: "pending" | "running" | "paused" | "success" | "error" | "cancelled";
    downloadUrl?: string;
    error?: string;
}

export function uploadFile(
    file: File,
    path: string = "portfolio",
    onProgress?: (progress: UploadProgress) => void
): { uploadTask: UploadTask; cancel: () => void } {
    const storageRef: StorageReference = ref(getFirebaseStorage(), `${path}/${Date.now()}_${file.name}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
        "state_changed",
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.({
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                status: "running",
            });
        },
        (error) => {
            onProgress?.({
                progress: 0,
                bytesTransferred: 0,
                totalBytes: file.size,
                status: "error",
                error: error.message,
            });
        },
        async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.({
                progress: 100,
                bytesTransferred: file.size,
                totalBytes: file.size,
                status: "success",
                downloadUrl,
            });
        }
    );

    return {
        uploadTask,
        cancel: () => uploadTask.cancel(),
    };
}

export async function uploadFileSimple(file: File, path: string = "portfolio"): Promise<UploadResult> {
    const storageRef: StorageReference = ref(getFirebaseStorage(), `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            () => {},
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                    url,
                    fileName: file.name,
                    fileType: file.type,
                    size: file.size,
                });
            }
        );
    });
}

export { getFirebaseApp, getFirebaseStorage };
