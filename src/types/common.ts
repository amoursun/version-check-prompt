export type IHtmlSourceParserItem = {
    /**
     * 链接地址
     */
    link: string;
    /**
     * 文本
     */
    text: string;
};

export interface IHtmlSourceParserResult {
    links: IHtmlSourceParserItem[];
    scripts: IHtmlSourceParserItem[];
    styles: IHtmlSourceParserItem[];
}