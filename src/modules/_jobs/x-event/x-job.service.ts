import { Injectable } from "@nestjs/common";
import { XService } from "../../_shared/x/x.service";

@Injectable()
export class XJobService {
  constructor(private readonly xService: XService) {}
}
