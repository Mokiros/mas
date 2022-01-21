import { Middlepoint } from './Middlepoint';
import { CustomRequest, CustomResponse } from './CustomRequestAndResponse';
declare function Preprocessor(req: CustomRequest, res: CustomResponse): Promise<void>;
declare function RegisterMiddlepoint(middlepoint: Middlepoint): void;
export { RegisterMiddlepoint };
export default Preprocessor;
