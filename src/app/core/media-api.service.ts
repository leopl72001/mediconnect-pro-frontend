import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface MediaView {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private readonly http = inject(HttpClient);

  mine() {
    return this.http.get<MediaView[]>('/api/v1/media/me');
  }

  upload(file: File) {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<MediaView>('/api/v1/media/me', body);
  }

  download(id: string) {
    return this.http.get(`/api/v1/media/me/${encodeURIComponent(id)}`, {
      responseType: 'blob'
    });
  }
}
