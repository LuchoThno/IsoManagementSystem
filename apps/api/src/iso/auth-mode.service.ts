import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export type AppAuthMode = 'clerk' | 'demo' | 'disabled';

type AuthModeSource = 'env' | 'legacy-default';

type SecurityPolicy = {
  mfa: {
    managedBy: 'clerk' | 'application' | 'none';
    required: boolean;
    status: 'enforced' | 'delegated' | 'not-applicable';
  };
  password: {
    managedBy: 'clerk' | 'application' | 'none';
    minLength: number | null;
    policy: string;
  };
  session: {
    managedBy: 'clerk' | 'application' | 'none';
    revocationModel: string;
  };
};

type PublicAuthConfig = {
  mode: AppAuthMode;
  source: AuthModeSource;
  clerkConfigured: boolean;
  provider: 'clerk' | 'demo' | 'disabled';
  capabilities: {
    directoryProvider: 'clerk' | 'local' | 'none';
    manualUserManagement: boolean;
    authenticatedRoutesAvailable: boolean;
  };
};

@Injectable()
export class AuthModeService {
  private readonly logger = new Logger(AuthModeService.name);
  private readonly configuredMode = process.env.APP_AUTH_MODE?.trim().toLowerCase() ?? '';
  private readonly clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim() ?? '';
  private readonly mode: AppAuthMode = this.resolveMode();
  private readonly source: AuthModeSource = this.configuredMode ? 'env' : 'legacy-default';

  constructor() {
    this.logResolvedMode();
  }

  getMode(): AppAuthMode {
    return this.mode;
  }

  isClerkMode() {
    return this.mode === 'clerk';
  }

  isDemoMode() {
    return this.mode === 'demo';
  }

  isDisabledMode() {
    return this.mode === 'disabled';
  }

  isClerkConfigured() {
    return this.clerkSecretKey.length > 0;
  }

  assertAuthenticationAvailable() {
    if (this.isDisabledMode()) {
      throw new ServiceUnavailableException(
        'La autenticación de la aplicación está deshabilitada por configuración.'
      );
    }
  }

  assertClerkReady() {
    if (!this.isClerkMode()) {
      throw new InternalServerErrorException(
        'Clerk no es el modo de autenticación activo en este entorno.'
      );
    }

    if (!this.isClerkConfigured()) {
      throw new InternalServerErrorException(
        'APP_AUTH_MODE=clerk requiere CLERK_SECRET_KEY en el backend.'
      );
    }
  }

  getPublicConfig(): PublicAuthConfig {
    return {
      mode: this.mode,
      source: this.source,
      clerkConfigured: this.isClerkConfigured(),
      provider: this.isClerkMode() ? 'clerk' : this.isDemoMode() ? 'demo' : 'disabled',
      capabilities: {
        directoryProvider: this.isClerkMode() ? 'clerk' : this.isDemoMode() ? 'local' : 'none',
        manualUserManagement: this.isDemoMode(),
        authenticatedRoutesAvailable: !this.isDisabledMode(),
      },
    };
  }

  getSecurityPolicy(): SecurityPolicy {
    if (this.isClerkMode()) {
      return {
        mfa: {
          managedBy: 'clerk',
          required: true,
          status: 'delegated',
        },
        password: {
          managedBy: 'clerk',
          minLength: null,
          policy: 'La política de contraseña se delega al proveedor Clerk y no se gestiona en la aplicación.',
        },
        session: {
          managedBy: 'clerk',
          revocationModel: 'Las sesiones y su revocación dependen del ciclo de vida de tokens y sesiones de Clerk.',
        },
      };
    }

    if (this.isDemoMode()) {
      return {
        mfa: {
          managedBy: 'none',
          required: false,
          status: 'not-applicable',
        },
        password: {
          managedBy: 'application',
          minLength: 6,
          policy: 'El modo demo mantiene una validación local mínima y no es apto para producción.',
        },
        session: {
          managedBy: 'application',
          revocationModel: 'La sesión local se controla en el cliente y debe considerarse solo para desarrollo o demostración.',
        },
      };
    }

    return {
      mfa: {
        managedBy: 'none',
        required: false,
        status: 'not-applicable',
      },
      password: {
        managedBy: 'none',
        minLength: null,
        policy: 'La autenticación está deshabilitada por configuración.',
      },
      session: {
        managedBy: 'none',
        revocationModel: 'No existen sesiones activas porque la autenticación está deshabilitada.',
      },
    };
  }

  private resolveMode(): AppAuthMode {
    switch (this.configuredMode) {
      case 'clerk':
      case 'demo':
      case 'disabled':
        return this.configuredMode;
      case '':
        return this.clerkSecretKey ? 'clerk' : 'demo';
      default:
        this.logger.warn(
          `APP_AUTH_MODE="${this.configuredMode}" no es válido. Se usará resolución por compatibilidad.`
        );
        return this.clerkSecretKey ? 'clerk' : 'demo';
    }
  }

  private logResolvedMode() {
    this.logger.log(
      `Authentication mode resolved to "${this.mode}" (${this.source}). clerkConfigured=${this.isClerkConfigured() ? 'yes' : 'no'}`
    );
  }
}
