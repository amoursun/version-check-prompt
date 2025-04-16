export type IHtmlSourceParserItem = string;

export interface IHtmlSourceParserResult {
    links: IHtmlSourceParserItem[];
    scripts: IHtmlSourceParserItem[];
    styles: IHtmlSourceParserItem[];
}