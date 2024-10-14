import type { PipeTransform } from "@nestjs/common";
import { JwtAuthGuard } from "common/guards/jwt-auth.guard";

import { applyDecorators, Param, ParseUUIDPipe, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { AuthUserInterceptor } from "../interceptors/auth-user-interceptor.service";

import type { Type } from "@nestjs/common/interfaces";
import { JwtAdminAuthGuard } from "common/guards/jwt-admin-auth.guard";
import { OptionalJwtAuthGuard } from "modules/auth/strategies/jwt-auth-optional.guard";

export function Auth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    ApiUnauthorizedResponse({ description: "Unauthorized" }),
  );
}

export function AuthAdmin(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAdminAuthGuard),
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    ApiUnauthorizedResponse({ description: "Unauthorized" }),
  );
}

export function AuthOptional(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(OptionalJwtAuthGuard), ApiBearerAuth(), UseInterceptors(AuthUserInterceptor));
}

export function UUIDParam(property: string, ...pipes: Array<Type<PipeTransform> | PipeTransform>): ParameterDecorator {
  return Param(property, new ParseUUIDPipe({ version: "4" }), ...pipes);
}
