import config from "common/config";
import express from "express";
import { UsersService } from "modules/users/users.service";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { AuthService } from "../auth.service";
import { TokenTypes } from "../constants/token.constant";

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(private readonly userService: UsersService, private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: express.Request, args: { user: string; type: TokenTypes }) {
    const accessToken = req.headers["authorization"]?.split(" ")[1] || "";
    const authenticatedUser = await this.authService.decodeAccessToken(accessToken);
    if (!authenticatedUser) {
      throw new UnauthorizedException("UNAUTHORIZED");
    }
    const user = await this.userService.getUserById(args.user);
    if (!user || !config.admin.includes(user._id.toString())) {
      throw new UnauthorizedException("Not admin")
    }

    return user.toJSON();
  }
}
