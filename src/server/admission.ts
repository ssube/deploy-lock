export const ADMISSION_VERSION = 'admission.k8s.io/v1';
export const ADMISSION_KIND = 'AdmissionReview';

export interface AdmissionKind {
  group: string;
  version: string;
  kind: string;
}

export interface AdmissionResource {
  group: string;
  version: string;
  resource: string;
}

export interface AdmissionVersion {
  apiVersion: string;
  kind: string;
}

export interface AdmissionRequest {
  apiVersion: typeof ADMISSION_VERSION;
  kind: typeof ADMISSION_KIND;
  request: {
    uid: string;
    kind: AdmissionKind;
    resource: AdmissionResource;
    subResource?: string;
    requestKind: AdmissionKind;
    requestResource: AdmissionResource;
    requestSubResource?: string;
    name: string;
    namespace: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONNECT';
    userInfo: {
      username: string;
      uid: string;
      groups: Array<string>;
      extra: Record<string, Array<string>>;
    };
    object: AdmissionVersion;
    oldObject: AdmissionVersion;
    options: AdmissionVersion;
    dryRun: boolean;
  };
}

export interface AdmissionResponse {
  apiVersion: typeof ADMISSION_VERSION;
  kind: typeof ADMISSION_KIND;
  response: {
    uid: string;
    allowed: boolean;
    status?: {
      code: number;
      message: string;
    };
  };
}

export function getAdmissionPath(base: string, req: AdmissionRequest): string {
  const segments = [
    base,
    req.request.namespace,
    // req.request.requestResource.group,
    // req.request.requestResource.resource,
    req.request.name,
  ];
  return segments.join('/');
}

export function buildAdmissionResponse(allowed: boolean, uid: string, message?: string): AdmissionResponse {
  return {
    apiVersion: ADMISSION_VERSION,
    kind: ADMISSION_KIND,
    response: {
      uid,
      allowed,
    }
  };
}
