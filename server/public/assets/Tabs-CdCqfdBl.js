import{S as _e,y as gt,bI as xt,cu as mt,e as ae,E as c,f as L,ar as yt,bs as wt,aU as te,aD as St,z as Ct,c3 as Rt,t as Ee,av as Tt,a$ as $t,F as zt,b0 as Pt,bN as Wt,N as ee,cv as _t,A as r,C as i,D as m,M as T,b1 as Et,bW as ie,O as Se,au as se,G as At,H as Ae,x as le,K as Lt,P as j,bb as Bt,U as I,b8 as Q,V as kt,cw as jt,ay as It,an as Ht,cx as Ot,bj as Ft,at as de,bd as Dt,bm as Z}from"./index-DA11XDlS.js";import{A as Mt}from"./Add-C6IKdIGC.js";import{u as Ce}from"./use-compitable-BnEdbODL.js";import{u as Nt}from"./use-merged-state-DvdMjKiF.js";let U,G;const Vt=()=>{var e,n;U=xt?(n=(e=document)===null||e===void 0?void 0:e.fonts)===null||n===void 0?void 0:n.ready:void 0,G=!1,U!==void 0?U.then(()=>{G=!0}):G=!0};Vt();function Ut(e){if(G)return;let n=!1;_e(()=>{G||U?.then(()=>{n||e()})}),gt(()=>{n=!0})}const{c:Re}=mt(),Xt="vueuc-style",Gt=Re(".v-x-scroll",{overflow:"auto",scrollbarWidth:"none"},[Re("&::-webkit-scrollbar",{width:0,height:0})]),Kt=ae({name:"XScroll",props:{disabled:Boolean,onScroll:Function},setup(){const e=L(null);function n(d){!(d.currentTarget.offsetWidth<d.currentTarget.scrollWidth)||d.deltaY===0||(d.currentTarget.scrollLeft+=d.deltaY+d.deltaX,d.preventDefault())}const s=yt();return Gt.mount({id:"vueuc/x-scroll",head:!0,anchorMetaName:Xt,ssr:s}),Object.assign({selfRef:e,handleWheel:n},{scrollTo(...d){var y;(y=e.value)===null||y===void 0||y.scrollTo(...d)}})},render(){return c("div",{ref:"selfRef",onScroll:this.onScroll,onWheel:this.disabled?void 0:this.handleWheel,class:"v-x-scroll"},this.$slots)}});var Yt=/\s/;function qt(e){for(var n=e.length;n--&&Yt.test(e.charAt(n)););return n}var Jt=/^\s+/;function Qt(e){return e&&e.slice(0,qt(e)+1).replace(Jt,"")}var Te=NaN,Zt=/^[-+]0x[0-9a-f]+$/i,ea=/^0b[01]+$/i,ta=/^0o[0-7]+$/i,aa=parseInt;function $e(e){if(typeof e=="number")return e;if(wt(e))return Te;if(te(e)){var n=typeof e.valueOf=="function"?e.valueOf():e;e=te(n)?n+"":n}if(typeof e!="string")return e===0?e:+e;e=Qt(e);var s=ea.test(e);return s||ta.test(e)?aa(e.slice(2),s?2:8):Zt.test(e)?Te:+e}var ce=function(){return St.Date.now()},ra="Expected a function",na=Math.max,oa=Math.min;function ia(e,n,s){var u,d,y,v,f,x,h=0,g=!1,_=!1,E=!0;if(typeof e!="function")throw new TypeError(ra);n=$e(n)||0,te(s)&&(g=!!s.leading,_="maxWait"in s,y=_?na($e(s.maxWait)||0,n):y,E="trailing"in s?!!s.trailing:E);function w(b){var R=u,F=d;return u=d=void 0,h=b,v=e.apply(F,R),v}function $(b){return h=b,f=setTimeout(W,n),g?w(b):v}function C(b){var R=b-x,F=b-h,K=n-R;return _?oa(K,y-F):K}function P(b){var R=b-x,F=b-h;return x===void 0||R>=n||R<0||_&&F>=y}function W(){var b=ce();if(P(b))return z(b);f=setTimeout(W,C(b))}function z(b){return f=void 0,E&&u?w(b):(u=d=void 0,v)}function O(){f!==void 0&&clearTimeout(f),h=0,u=x=d=f=void 0}function A(){return f===void 0?v:z(ce())}function p(){var b=ce(),R=P(b);if(u=arguments,d=this,x=b,R){if(f===void 0)return $(x);if(_)return clearTimeout(f),f=setTimeout(W,n),w(x)}return f===void 0&&(f=setTimeout(W,n)),v}return p.cancel=O,p.flush=A,p}var sa="Expected a function";function la(e,n,s){var u=!0,d=!0;if(typeof e!="function")throw new TypeError(sa);return te(s)&&(u="leading"in s?!!s.leading:u,d="trailing"in s?!!s.trailing:d),ia(e,n,{leading:u,maxWait:n,trailing:d})}const ue=Ct("n-tabs"),Le={tab:[String,Number,Object,Function],name:{type:[String,Number],required:!0},disabled:Boolean,displayDirective:{type:String,default:"if"},closable:{type:Boolean,default:void 0},tabProps:Object,label:[String,Number,Object,Function]},ha=ae({__TAB_PANE__:!0,name:"TabPane",alias:["TabPanel"],props:Le,slots:Object,setup(e){const n=Ee(ue,null);return n||Rt("tab-pane","`n-tab-pane` must be placed inside `n-tabs`."),{style:n.paneStyleRef,class:n.paneClassRef,mergedClsPrefix:n.mergedClsPrefixRef}},render(){return c("div",{class:[`${this.mergedClsPrefix}-tab-pane`,this.class],style:this.style},this.$slots)}}),da=Object.assign({internalLeftPadded:Boolean,internalAddable:Boolean,internalCreatedByPane:Boolean},_t(Le,["displayDirective"])),pe=ae({__TAB__:!0,inheritAttrs:!1,name:"Tab",props:da,setup(e){const{mergedClsPrefixRef:n,valueRef:s,typeRef:u,closableRef:d,tabStyleRef:y,addTabStyleRef:v,tabClassRef:f,addTabClassRef:x,tabChangeIdRef:h,onBeforeLeaveRef:g,triggerRef:_,handleAdd:E,activateTab:w,handleClose:$}=Ee(ue);return{trigger:_,mergedClosable:ee(()=>{if(e.internalAddable)return!1;const{closable:C}=e;return C===void 0?d.value:C}),style:y,addStyle:v,tabClass:f,addTabClass:x,clsPrefix:n,value:s,type:u,handleClose(C){C.stopPropagation(),!e.disabled&&$(e.name)},activateTab(){if(e.disabled)return;if(e.internalAddable){E();return}const{name:C}=e,P=++h.id;if(C!==s.value){const{value:W}=g;W?Promise.resolve(W(e.name,s.value)).then(z=>{z&&h.id===P&&w(C)}):w(C)}}}},render(){const{internalAddable:e,clsPrefix:n,name:s,disabled:u,label:d,tab:y,value:v,mergedClosable:f,trigger:x,$slots:{default:h}}=this,g=d??y;return c("div",{class:`${n}-tabs-tab-wrapper`},this.internalLeftPadded?c("div",{class:`${n}-tabs-tab-pad`}):null,c("div",Object.assign({key:s,"data-name":s,"data-disabled":u?!0:void 0},Tt({class:[`${n}-tabs-tab`,v===s&&`${n}-tabs-tab--active`,u&&`${n}-tabs-tab--disabled`,f&&`${n}-tabs-tab--closable`,e&&`${n}-tabs-tab--addable`,e?this.addTabClass:this.tabClass],onClick:x==="click"?this.activateTab:void 0,onMouseenter:x==="hover"?this.activateTab:void 0,style:e?this.addStyle:this.style},this.internalCreatedByPane?this.tabProps||{}:this.$attrs)),c("span",{class:`${n}-tabs-tab__label`},e?c(zt,null,c("div",{class:`${n}-tabs-tab__height-placeholder`}," "),c(Pt,{clsPrefix:n},{default:()=>c(Mt,null)})):h?h():typeof g=="object"?g:$t(g??s)),f&&this.type==="card"?c(Wt,{clsPrefix:n,class:`${n}-tabs-tab__close`,onClick:this.handleClose,disabled:u}):null))}}),ca=r("tabs",`
 box-sizing: border-box;
 width: 100%;
 display: flex;
 flex-direction: column;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
`,[i("segment-type",[r("tabs-rail",[m("&.transition-disabled",[r("tabs-capsule",`
 transition: none;
 `)])])]),i("top",[r("tab-pane",`
 padding: var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left);
 `)]),i("left",[r("tab-pane",`
 padding: var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left) var(--n-pane-padding-top);
 `)]),i("left, right",`
 flex-direction: row;
 `,[r("tabs-bar",`
 width: 2px;
 right: 0;
 transition:
 top .2s var(--n-bezier),
 max-height .2s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),r("tabs-tab",`
 padding: var(--n-tab-padding-vertical); 
 `)]),i("right",`
 flex-direction: row-reverse;
 `,[r("tab-pane",`
 padding: var(--n-pane-padding-left) var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom);
 `),r("tabs-bar",`
 left: 0;
 `)]),i("bottom",`
 flex-direction: column-reverse;
 justify-content: flex-end;
 `,[r("tab-pane",`
 padding: var(--n-pane-padding-bottom) var(--n-pane-padding-right) var(--n-pane-padding-top) var(--n-pane-padding-left);
 `),r("tabs-bar",`
 top: 0;
 `)]),r("tabs-rail",`
 position: relative;
 padding: 3px;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 background-color: var(--n-color-segment);
 transition: background-color .3s var(--n-bezier);
 display: flex;
 align-items: center;
 `,[r("tabs-capsule",`
 border-radius: var(--n-tab-border-radius);
 position: absolute;
 pointer-events: none;
 background-color: var(--n-tab-color-segment);
 box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .08);
 transition: transform 0.3s var(--n-bezier);
 `),r("tabs-tab-wrapper",`
 flex-basis: 0;
 flex-grow: 1;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[r("tabs-tab",`
 overflow: hidden;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[i("active",`
 font-weight: var(--n-font-weight-strong);
 color: var(--n-tab-text-color-active);
 `),m("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])])]),i("flex",[r("tabs-nav",`
 width: 100%;
 position: relative;
 `,[r("tabs-wrapper",`
 width: 100%;
 `,[r("tabs-tab",`
 margin-right: 0;
 `)])])]),r("tabs-nav",`
 box-sizing: border-box;
 line-height: 1.5;
 display: flex;
 transition: border-color .3s var(--n-bezier);
 `,[T("prefix, suffix",`
 display: flex;
 align-items: center;
 `),T("prefix","padding-right: 16px;"),T("suffix","padding-left: 16px;")]),i("top, bottom",[m(">",[r("tabs-nav",[r("tabs-nav-scroll-wrapper",[m("&::before",`
 top: 0;
 bottom: 0;
 left: 0;
 width: 20px;
 `),m("&::after",`
 top: 0;
 bottom: 0;
 right: 0;
 width: 20px;
 `),i("shadow-start",[m("&::before",`
 box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, .12);
 `)]),i("shadow-end",[m("&::after",`
 box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, .12);
 `)])])])])]),i("left, right",[r("tabs-nav-scroll-content",`
 flex-direction: column;
 `),m(">",[r("tabs-nav",[r("tabs-nav-scroll-wrapper",[m("&::before",`
 top: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),m("&::after",`
 bottom: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),i("shadow-start",[m("&::before",`
 box-shadow: inset 0 10px 8px -8px rgba(0, 0, 0, .12);
 `)]),i("shadow-end",[m("&::after",`
 box-shadow: inset 0 -10px 8px -8px rgba(0, 0, 0, .12);
 `)])])])])]),r("tabs-nav-scroll-wrapper",`
 flex: 1;
 position: relative;
 overflow: hidden;
 `,[r("tabs-nav-y-scroll",`
 height: 100%;
 width: 100%;
 overflow-y: auto; 
 scrollbar-width: none;
 `,[m("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb",`
 width: 0;
 height: 0;
 display: none;
 `)]),m("&::before, &::after",`
 transition: box-shadow .3s var(--n-bezier);
 pointer-events: none;
 content: "";
 position: absolute;
 z-index: 1;
 `)]),r("tabs-nav-scroll-content",`
 display: flex;
 position: relative;
 min-width: 100%;
 min-height: 100%;
 width: fit-content;
 box-sizing: border-box;
 `),r("tabs-wrapper",`
 display: inline-flex;
 flex-wrap: nowrap;
 position: relative;
 `),r("tabs-tab-wrapper",`
 display: flex;
 flex-wrap: nowrap;
 flex-shrink: 0;
 flex-grow: 0;
 `),r("tabs-tab",`
 cursor: pointer;
 white-space: nowrap;
 flex-wrap: nowrap;
 display: inline-flex;
 align-items: center;
 color: var(--n-tab-text-color);
 font-size: var(--n-tab-font-size);
 background-clip: padding-box;
 padding: var(--n-tab-padding);
 transition:
 box-shadow .3s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[i("disabled",{cursor:"not-allowed"}),T("close",`
 margin-left: 6px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `),T("label",`
 display: flex;
 align-items: center;
 z-index: 1;
 `)]),r("tabs-bar",`
 position: absolute;
 bottom: 0;
 height: 2px;
 border-radius: 1px;
 background-color: var(--n-bar-color);
 transition:
 left .2s var(--n-bezier),
 max-width .2s var(--n-bezier),
 opacity .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `,[m("&.transition-disabled",`
 transition: none;
 `),i("disabled",`
 background-color: var(--n-tab-text-color-disabled)
 `)]),r("tabs-pane-wrapper",`
 position: relative;
 overflow: hidden;
 transition: max-height .2s var(--n-bezier);
 `),r("tab-pane",`
 color: var(--n-pane-text-color);
 width: 100%;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 opacity .2s var(--n-bezier);
 left: 0;
 right: 0;
 top: 0;
 `,[m("&.next-transition-leave-active, &.prev-transition-leave-active, &.next-transition-enter-active, &.prev-transition-enter-active",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 transform .2s var(--n-bezier),
 opacity .2s var(--n-bezier);
 `),m("&.next-transition-leave-active, &.prev-transition-leave-active",`
 position: absolute;
 `),m("&.next-transition-enter-from, &.prev-transition-leave-to",`
 transform: translateX(32px);
 opacity: 0;
 `),m("&.next-transition-leave-to, &.prev-transition-enter-from",`
 transform: translateX(-32px);
 opacity: 0;
 `),m("&.next-transition-leave-from, &.next-transition-enter-to, &.prev-transition-leave-from, &.prev-transition-enter-to",`
 transform: translateX(0);
 opacity: 1;
 `)]),r("tabs-tab-pad",`
 box-sizing: border-box;
 width: var(--n-tab-gap);
 flex-grow: 0;
 flex-shrink: 0;
 `),i("line-type, bar-type",[r("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 box-sizing: border-box;
 vertical-align: bottom;
 `,[m("&:hover",{color:"var(--n-tab-text-color-hover)"}),i("active",`
 color: var(--n-tab-text-color-active);
 font-weight: var(--n-tab-font-weight-active);
 `),i("disabled",{color:"var(--n-tab-text-color-disabled)"})])]),r("tabs-nav",[i("line-type",[i("top",[T("prefix, suffix",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 bottom: -1px;
 `)]),i("left",[T("prefix, suffix",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 right: -1px;
 `)]),i("right",[T("prefix, suffix",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 left: -1px;
 `)]),i("bottom",[T("prefix, suffix",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 top: -1px;
 `)]),T("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-nav-scroll-content",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-bar",`
 border-radius: 0;
 `)]),i("card-type",[T("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-pad",`
 flex-grow: 1;
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-tab-pad",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 border: 1px solid var(--n-tab-border-color);
 background-color: var(--n-tab-color);
 box-sizing: border-box;
 position: relative;
 vertical-align: bottom;
 display: flex;
 justify-content: space-between;
 font-size: var(--n-tab-font-size);
 color: var(--n-tab-text-color);
 `,[i("addable",`
 padding-left: 8px;
 padding-right: 8px;
 font-size: 16px;
 justify-content: center;
 `,[T("height-placeholder",`
 width: 0;
 font-size: var(--n-tab-font-size);
 `),Et("disabled",[m("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])]),i("closable","padding-right: 8px;"),i("active",`
 background-color: #0000;
 font-weight: var(--n-tab-font-weight-active);
 color: var(--n-tab-text-color-active);
 `),i("disabled","color: var(--n-tab-text-color-disabled);")])]),i("left, right",`
 flex-direction: column; 
 `,[T("prefix, suffix",`
 padding: var(--n-tab-padding-vertical);
 `),r("tabs-wrapper",`
 flex-direction: column;
 `),r("tabs-tab-wrapper",`
 flex-direction: column;
 `,[r("tabs-tab-pad",`
 height: var(--n-tab-gap-vertical);
 width: 100%;
 `)])]),i("top",[i("card-type",[r("tabs-scroll-padding","border-bottom: 1px solid var(--n-tab-border-color);"),T("prefix, suffix",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-top-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-bottom: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `)])]),i("left",[i("card-type",[r("tabs-scroll-padding","border-right: 1px solid var(--n-tab-border-color);"),T("prefix, suffix",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-bottom-left-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-right: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `)])]),i("right",[i("card-type",[r("tabs-scroll-padding","border-left: 1px solid var(--n-tab-border-color);"),T("prefix, suffix",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-right-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-left: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `)])]),i("bottom",[i("card-type",[r("tabs-scroll-padding","border-top: 1px solid var(--n-tab-border-color);"),T("prefix, suffix",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-bottom-left-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-top: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `)])])])]),be=la,ba=Object.assign(Object.assign({},Ae.props),{value:[String,Number],defaultValue:[String,Number],trigger:{type:String,default:"click"},type:{type:String,default:"bar"},closable:Boolean,justifyContent:String,size:{type:String,default:"medium"},placement:{type:String,default:"top"},tabStyle:[String,Object],tabClass:String,addTabStyle:[String,Object],addTabClass:String,barWidth:Number,paneClass:String,paneStyle:[String,Object],paneWrapperClass:String,paneWrapperStyle:[String,Object],addable:[Boolean,Object],tabsPadding:{type:Number,default:0},animated:Boolean,onBeforeLeave:Function,onAdd:Function,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onClose:[Function,Array],labelSize:String,activeName:[String,Number],onActiveNameChange:[Function,Array]}),ga=ae({name:"Tabs",props:ba,slots:Object,setup(e,{slots:n}){var s,u,d,y;const{mergedClsPrefixRef:v,inlineThemeDisabled:f}=At(e),x=Ae("Tabs","-tabs",ca,jt,e,v),h=L(null),g=L(null),_=L(null),E=L(null),w=L(null),$=L(null),C=L(!0),P=L(!0),W=Ce(e,["labelSize","size"]),z=Ce(e,["activeName","value"]),O=L((u=(s=z.value)!==null&&s!==void 0?s:e.defaultValue)!==null&&u!==void 0?u:n.default?(y=(d=ie(n.default())[0])===null||d===void 0?void 0:d.props)===null||y===void 0?void 0:y.name:null),A=Nt(z,O),p={id:0},b=ee(()=>{if(!(!e.justifyContent||e.type==="card"))return{display:"flex",justifyContent:e.justifyContent}});le(A,()=>{p.id=0,Y(),he()});function R(){var t;const{value:a}=A;return a===null?null:(t=h.value)===null||t===void 0?void 0:t.querySelector(`[data-name="${a}"]`)}function F(t){if(e.type==="card")return;const{value:a}=g;if(!a)return;const o=a.style.opacity==="0";if(t){const l=`${v.value}-tabs-bar--disabled`,{barWidth:S,placement:B}=e;if(t.dataset.disabled==="true"?a.classList.add(l):a.classList.remove(l),["top","bottom"].includes(B)){if(ve(["top","maxHeight","height"]),typeof S=="number"&&t.offsetWidth>=S){const k=Math.floor((t.offsetWidth-S)/2)+t.offsetLeft;a.style.left=`${k}px`,a.style.maxWidth=`${S}px`}else a.style.left=`${t.offsetLeft}px`,a.style.maxWidth=`${t.offsetWidth}px`;a.style.width="8192px",o&&(a.style.transition="none"),a.offsetWidth,o&&(a.style.transition="",a.style.opacity="1")}else{if(ve(["left","maxWidth","width"]),typeof S=="number"&&t.offsetHeight>=S){const k=Math.floor((t.offsetHeight-S)/2)+t.offsetTop;a.style.top=`${k}px`,a.style.maxHeight=`${S}px`}else a.style.top=`${t.offsetTop}px`,a.style.maxHeight=`${t.offsetHeight}px`;a.style.height="8192px",o&&(a.style.transition="none"),a.offsetHeight,o&&(a.style.transition="",a.style.opacity="1")}}}function K(){if(e.type==="card")return;const{value:t}=g;t&&(t.style.opacity="0")}function ve(t){const{value:a}=g;if(a)for(const o of t)a.style[o]=""}function Y(){if(e.type==="card")return;const t=R();t?F(t):K()}function he(){var t;const a=(t=w.value)===null||t===void 0?void 0:t.$el;if(!a)return;const o=R();if(!o)return;const{scrollLeft:l,offsetWidth:S}=a,{offsetLeft:B,offsetWidth:k}=o;l>B?a.scrollTo({top:0,left:B,behavior:"smooth"}):B+k>l+S&&a.scrollTo({top:0,left:B+k-S,behavior:"smooth"})}const q=L(null);let re=0,H=null;function Be(t){const a=q.value;if(a){re=t.getBoundingClientRect().height;const o=`${re}px`,l=()=>{a.style.height=o,a.style.maxHeight=o};H?(l(),H(),H=null):H=l}}function ke(t){const a=q.value;if(a){const o=t.getBoundingClientRect().height,l=()=>{document.body.offsetHeight,a.style.maxHeight=`${o}px`,a.style.height=`${Math.max(re,o)}px`};H?(H(),H=null,l()):H=l}}function je(){const t=q.value;if(t){t.style.maxHeight="",t.style.height="";const{paneWrapperStyle:a}=e;if(typeof a=="string")t.style.cssText=a;else if(a){const{maxHeight:o,height:l}=a;o!==void 0&&(t.style.maxHeight=o),l!==void 0&&(t.style.height=l)}}}const ge={value:[]},xe=L("next");function Ie(t){const a=A.value;let o="next";for(const l of ge.value){if(l===a)break;if(l===t){o="prev";break}}xe.value=o,He(t)}function He(t){const{onActiveNameChange:a,onUpdateValue:o,"onUpdate:value":l}=e;a&&Z(a,t),o&&Z(o,t),l&&Z(l,t),O.value=t}function Oe(t){const{onClose:a}=e;a&&Z(a,t)}function me(){const{value:t}=g;if(!t)return;const a="transition-disabled";t.classList.add(a),Y(),t.classList.remove(a)}const D=L(null);function ne({transitionDisabled:t}){const a=h.value;if(!a)return;t&&a.classList.add("transition-disabled");const o=R();o&&D.value&&(D.value.style.width=`${o.offsetWidth}px`,D.value.style.height=`${o.offsetHeight}px`,D.value.style.transform=`translateX(${o.offsetLeft-It(getComputedStyle(a).paddingLeft)}px)`,t&&D.value.offsetWidth),t&&a.classList.remove("transition-disabled")}le([A],()=>{e.type==="segment"&&de(()=>{ne({transitionDisabled:!1})})}),_e(()=>{e.type==="segment"&&ne({transitionDisabled:!0})});let ye=0;function Fe(t){var a;if(t.contentRect.width===0&&t.contentRect.height===0||ye===t.contentRect.width)return;ye=t.contentRect.width;const{type:o}=e;if((o==="line"||o==="bar")&&me(),o!=="segment"){const{placement:l}=e;oe((l==="top"||l==="bottom"?(a=w.value)===null||a===void 0?void 0:a.$el:$.value)||null)}}const De=be(Fe,64);le([()=>e.justifyContent,()=>e.size],()=>{de(()=>{const{type:t}=e;(t==="line"||t==="bar")&&me()})});const M=L(!1);function Me(t){var a;const{target:o,contentRect:{width:l,height:S}}=t,B=o.parentElement.parentElement.offsetWidth,k=o.parentElement.parentElement.offsetHeight,{placement:V}=e;if(!M.value)V==="top"||V==="bottom"?B<l&&(M.value=!0):k<S&&(M.value=!0);else{const{value:X}=E;if(!X)return;V==="top"||V==="bottom"?B-l>X.$el.offsetWidth&&(M.value=!1):k-S>X.$el.offsetHeight&&(M.value=!1)}oe(((a=w.value)===null||a===void 0?void 0:a.$el)||null)}const Ne=be(Me,64);function Ve(){const{onAdd:t}=e;t&&t(),de(()=>{const a=R(),{value:o}=w;!a||!o||o.scrollTo({left:a.offsetLeft,top:0,behavior:"smooth"})})}function oe(t){if(!t)return;const{placement:a}=e;if(a==="top"||a==="bottom"){const{scrollLeft:o,scrollWidth:l,offsetWidth:S}=t;C.value=o<=0,P.value=o+S>=l}else{const{scrollTop:o,scrollHeight:l,offsetHeight:S}=t;C.value=o<=0,P.value=o+S>=l}}const Ue=be(t=>{oe(t.target)},64);Lt(ue,{triggerRef:j(e,"trigger"),tabStyleRef:j(e,"tabStyle"),tabClassRef:j(e,"tabClass"),addTabStyleRef:j(e,"addTabStyle"),addTabClassRef:j(e,"addTabClass"),paneClassRef:j(e,"paneClass"),paneStyleRef:j(e,"paneStyle"),mergedClsPrefixRef:v,typeRef:j(e,"type"),closableRef:j(e,"closable"),valueRef:A,tabChangeIdRef:p,onBeforeLeaveRef:j(e,"onBeforeLeave"),activateTab:Ie,handleClose:Oe,handleAdd:Ve}),Ut(()=>{Y(),he()}),Bt(()=>{const{value:t}=_;if(!t)return;const{value:a}=v,o=`${a}-tabs-nav-scroll-wrapper--shadow-start`,l=`${a}-tabs-nav-scroll-wrapper--shadow-end`;C.value?t.classList.remove(o):t.classList.add(o),P.value?t.classList.remove(l):t.classList.add(l)});const Xe={syncBarPosition:()=>{Y()}},Ge=()=>{ne({transitionDisabled:!0})},we=ee(()=>{const{value:t}=W,{type:a}=e,o={card:"Card",bar:"Bar",line:"Line",segment:"Segment"}[a],l=`${t}${o}`,{self:{barColor:S,closeIconColor:B,closeIconColorHover:k,closeIconColorPressed:V,tabColor:X,tabBorderColor:Ke,paneTextColor:Ye,tabFontWeight:qe,tabBorderRadius:Je,tabFontWeightActive:Qe,colorSegment:Ze,fontWeightStrong:et,tabColorSegment:tt,closeSize:at,closeIconSize:rt,closeColorHover:nt,closeColorPressed:ot,closeBorderRadius:it,[I("panePadding",t)]:J,[I("tabPadding",l)]:st,[I("tabPaddingVertical",l)]:lt,[I("tabGap",l)]:dt,[I("tabGap",`${l}Vertical`)]:ct,[I("tabTextColor",a)]:bt,[I("tabTextColorActive",a)]:ft,[I("tabTextColorHover",a)]:pt,[I("tabTextColorDisabled",a)]:ut,[I("tabFontSize",t)]:vt},common:{cubicBezierEaseInOut:ht}}=x.value;return{"--n-bezier":ht,"--n-color-segment":Ze,"--n-bar-color":S,"--n-tab-font-size":vt,"--n-tab-text-color":bt,"--n-tab-text-color-active":ft,"--n-tab-text-color-disabled":ut,"--n-tab-text-color-hover":pt,"--n-pane-text-color":Ye,"--n-tab-border-color":Ke,"--n-tab-border-radius":Je,"--n-close-size":at,"--n-close-icon-size":rt,"--n-close-color-hover":nt,"--n-close-color-pressed":ot,"--n-close-border-radius":it,"--n-close-icon-color":B,"--n-close-icon-color-hover":k,"--n-close-icon-color-pressed":V,"--n-tab-color":X,"--n-tab-font-weight":qe,"--n-tab-font-weight-active":Qe,"--n-tab-padding":st,"--n-tab-padding-vertical":lt,"--n-tab-gap":dt,"--n-tab-gap-vertical":ct,"--n-pane-padding-left":Q(J,"left"),"--n-pane-padding-right":Q(J,"right"),"--n-pane-padding-top":Q(J,"top"),"--n-pane-padding-bottom":Q(J,"bottom"),"--n-font-weight-strong":et,"--n-tab-color-segment":tt}}),N=f?kt("tabs",ee(()=>`${W.value[0]}${e.type[0]}`),we,e):void 0;return Object.assign({mergedClsPrefix:v,mergedValue:A,renderedNames:new Set,segmentCapsuleElRef:D,tabsPaneWrapperRef:q,tabsElRef:h,barElRef:g,addTabInstRef:E,xScrollInstRef:w,scrollWrapperElRef:_,addTabFixed:M,tabWrapperStyle:b,handleNavResize:De,mergedSize:W,handleScroll:Ue,handleTabsResize:Ne,cssVars:f?void 0:we,themeClass:N?.themeClass,animationDirection:xe,renderNameListRef:ge,yScrollElRef:$,handleSegmentResize:Ge,onAnimationBeforeLeave:Be,onAnimationEnter:ke,onAnimationAfterEnter:je,onRender:N?.onRender},Xe)},render(){const{mergedClsPrefix:e,type:n,placement:s,addTabFixed:u,addable:d,mergedSize:y,renderNameListRef:v,onRender:f,paneWrapperClass:x,paneWrapperStyle:h,$slots:{default:g,prefix:_,suffix:E}}=this;f?.();const w=g?ie(g()).filter(p=>p.type.__TAB_PANE__===!0):[],$=g?ie(g()).filter(p=>p.type.__TAB__===!0):[],C=!$.length,P=n==="card",W=n==="segment",z=!P&&!W&&this.justifyContent;v.value=[];const O=()=>{const p=c("div",{style:this.tabWrapperStyle,class:`${e}-tabs-wrapper`},z?null:c("div",{class:`${e}-tabs-scroll-padding`,style:s==="top"||s==="bottom"?{width:`${this.tabsPadding}px`}:{height:`${this.tabsPadding}px`}}),C?w.map((b,R)=>(v.value.push(b.props.name),fe(c(pe,Object.assign({},b.props,{internalCreatedByPane:!0,internalLeftPadded:R!==0&&(!z||z==="center"||z==="start"||z==="end")}),b.children?{default:b.children.tab}:void 0)))):$.map((b,R)=>(v.value.push(b.props.name),fe(R!==0&&!z?We(b):b))),!u&&d&&P?Pe(d,(C?w.length:$.length)!==0):null,z?null:c("div",{class:`${e}-tabs-scroll-padding`,style:{width:`${this.tabsPadding}px`}}));return c("div",{ref:"tabsElRef",class:`${e}-tabs-nav-scroll-content`},P&&d?c(se,{onResize:this.handleTabsResize},{default:()=>p}):p,P?c("div",{class:`${e}-tabs-pad`}):null,P?null:c("div",{ref:"barElRef",class:`${e}-tabs-bar`}))},A=W?"top":s;return c("div",{class:[`${e}-tabs`,this.themeClass,`${e}-tabs--${n}-type`,`${e}-tabs--${y}-size`,z&&`${e}-tabs--flex`,`${e}-tabs--${A}`],style:this.cssVars},c("div",{class:[`${e}-tabs-nav--${n}-type`,`${e}-tabs-nav--${A}`,`${e}-tabs-nav`]},Se(_,p=>p&&c("div",{class:`${e}-tabs-nav__prefix`},p)),W?c(se,{onResize:this.handleSegmentResize},{default:()=>c("div",{class:`${e}-tabs-rail`,ref:"tabsElRef"},c("div",{class:`${e}-tabs-capsule`,ref:"segmentCapsuleElRef"},c("div",{class:`${e}-tabs-wrapper`},c("div",{class:`${e}-tabs-tab`}))),C?w.map((p,b)=>(v.value.push(p.props.name),c(pe,Object.assign({},p.props,{internalCreatedByPane:!0,internalLeftPadded:b!==0}),p.children?{default:p.children.tab}:void 0))):$.map((p,b)=>(v.value.push(p.props.name),b===0?p:We(p))))}):c(se,{onResize:this.handleNavResize},{default:()=>c("div",{class:`${e}-tabs-nav-scroll-wrapper`,ref:"scrollWrapperElRef"},["top","bottom"].includes(A)?c(Kt,{ref:"xScrollInstRef",onScroll:this.handleScroll},{default:O}):c("div",{class:`${e}-tabs-nav-y-scroll`,onScroll:this.handleScroll,ref:"yScrollElRef"},O()))}),u&&d&&P?Pe(d,!0):null,Se(E,p=>p&&c("div",{class:`${e}-tabs-nav__suffix`},p))),C&&(this.animated&&(A==="top"||A==="bottom")?c("div",{ref:"tabsPaneWrapperRef",style:h,class:[`${e}-tabs-pane-wrapper`,x]},ze(w,this.mergedValue,this.renderedNames,this.onAnimationBeforeLeave,this.onAnimationEnter,this.onAnimationAfterEnter,this.animationDirection)):ze(w,this.mergedValue,this.renderedNames)))}});function ze(e,n,s,u,d,y,v){const f=[];return e.forEach(x=>{const{name:h,displayDirective:g,"display-directive":_}=x.props,E=$=>g===$||_===$,w=n===h;if(x.key!==void 0&&(x.key=h),w||E("show")||E("show:lazy")&&s.has(h)){s.has(h)||s.add(h);const $=!E("if");f.push($?Ht(x,[[Dt,w]]):x)}}),v?c(Ot,{name:`${v}-transition`,onBeforeLeave:u,onEnter:d,onAfterEnter:y},{default:()=>f}):f}function Pe(e,n){return c(pe,{ref:"addTabInstRef",key:"__addable",name:"__addable",internalCreatedByPane:!0,internalAddable:!0,internalLeftPadded:n,disabled:typeof e=="object"&&e.disabled})}function We(e){const n=Ft(e);return n.props?n.props.internalLeftPadded=!0:n.props={internalLeftPadded:!0},n}function fe(e){return Array.isArray(e.dynamicProps)?e.dynamicProps.includes("internalLeftPadded")||e.dynamicProps.push("internalLeftPadded"):e.dynamicProps=["internalLeftPadded"],e}export{ga as N,pe as a,ha as b,Re as c,Xt as d,Ut as o};
