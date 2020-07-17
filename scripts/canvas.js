import{Color}from"./colors.js";import{rotate,translate,scale,rotateAboutPoint,slerpPoints,lerp}from"./math.js";class Canvas{constructor(a,b,c){this.canvasEl=a,this.ctx=b,this._origin=c}map(a){return this._origin=a(this._origin),this}translate(a,b){return this._origin=translate(this._origin,a,b),this}scale(a){return this._origin=scale(this._origin,a),this}rotate(a,b=!1){return this._origin=rotate(this._origin,a,b),this}rotateAboutPoint(a,b,c,d=!1){return this._origin=rotateAboutPoint(this._origin,a,b,c,d),this}clear(){this.ctx.clearRect(0,0,this.width,this.height)}get origin(){return this._origin}set origin(a){this._origin=a}get originX(){return this._origin[0]}set originX(a){this._origin[0]=a}get originY(){return this._origin[1]}set originY(a){this._origin[1]=a}get width(){return this.canvasEl.width}set width(a){this.canvasEl.width=a}get height(){return this.canvasEl.height}set height(a){this.canvasEl.height=a}}class Shape{constructor(a,b,c,d,e,f){this._points=a,this._color=b==null?"black":b,this._lineWidth=c==null?1:c,this._fillColor=d,this._shadowColor=e,this._shadowBlur=f}map(a){return this._points.map((b,c)=>a(b,c)),this}translate(a,b){return this._points.map(c=>translate(c,a,b)),this}scale(a){return this._points.map(b=>scale(b,a)),this}rotate(a,b=!1){return this._points.map(c=>rotate(c,a,b)),this}rotateAboutPoint(a,b,c,d=!1){return this._points.map(e=>{rotateAboutPoint(e,a,b,c,d)}),this}get points(){return this._points}set points(a){this._points=a}get centroid(){let a=0,b=0;for(let[c,d]of this._points)a+=c,b+=d;return a/=this._points.length,b/=this._points.length,[a,b]}get color(){return this._color}set color(a){this._color=a instanceof Color?a.colorString:a}get lineWidth(){return this._lineWidth}set lineWidth(a){this._lineWidth=a}get fillColor(){return this._fillColor}set fillColor(a){this._fillColor=a}get shadowColor(){return this._shadowColor}set shadowColor(a){this._shadowColor=a}get shadowBlur(){return this._shadowBlur}set shadowBlur(a){this._shadowBlur=a}}class Polygon extends Shape{constructor(a,b,c,d){super(a,b,c,d)}draw(a){let b=0,c=0;if(a instanceof Canvas){let d=a;a=d.ctx,b=d.originX,c=d.originY}a.beginPath(),a.strokeStyle=this._color,a.lineWidth=this._lineWidth,this._fillColor&&(a.fillStyle=this._fillColor),a.shadowColor=this._shadowColor?this._shadowColor:"black",a.shadowBlur=this._shadowBlur?this._shadowBlur:0;for(let[d,e]of this._points)a.lineTo(d+b,c+e);return this._fillColor?a.fill():a.stroke(),this}}class Arc extends Shape{constructor(a,b,c,d,e,f,g){super([[a,b]],f,g),this._radius=c,this._beginAngle=d,this._endAngle=e}draw(a){let b=0,c=0;if(a instanceof Canvas){let d=a;a=d.ctx,b=d.originX,c=d.originY}return a.beginPath(),a.strokeStyle=this._color,a.lineWidth=this._lineWidth,this._fillColor&&(a.fillStyle=this._fillColor),a.shadowColor=this._shadowColor?this._shadowColor:"black",a.shadowBlur=this._shadowBlur?this._shadowBlur:0,a.arc(this.points[0][0]+b,this.points[0][1]+c,this._radius,this._beginAngle,this._endAngle),this._fillColor?a.fill():a.stroke(),this}get radius(){return this._radius}set radius(a){this._radius=a}get beginAngle(){return this._beginAngle}set beginAngle(a){this._beginAngle=a}get endAngle(){return this._endAngle}set endAngle(a){this._endAngle=a}}class Rectangle extends Polygon{constructor(a,b,c,d,e){super([[a,b],[a+c,b],[a+c,b+d],[a,b+d]],void 0,void 0,e),this._width=c,this._height=d,this.leftX=a,this.leftY=b}get height(){return this._height}set height(a){this._points[2][1]=a,this._points[3][1]=a,this._height=a}get width(){return this._width}set width(a){this._points[1][0]=a,this._points[2][0]=a,this._width=a}}class Mesh{constructor(...a){this.shapes=a}add(a){return this.shapes.push(a),this}draw(a,b){for(let c of this.shapes)c.draw(a,b);return this}map(a){let b=0;for(let c of this.shapes)a(c,b++);return this}translate(a,b){for(let c of this.shapes)c.translate(a,b);return this}scale(a){for(let b of this.shapes)b.scale(a);return this}rotate(a,b=!1){for(let c of this.shapes)c.rotate(a,b);return this}rotateAboutPoint(a,b,c,d=!1){for(let e of this.shapes)e.rotateAboutPoint(a,b,c,d);return this}}function roundedArc(a,b,c,d,e,f,g){var h=Math.sin,i=Math.cos;let j=-0,k=c+g/2,l=.05,m=g,n=[[0,l],[m,l]],o=slerpPoints(n[0],n[1]),p=[...o],q=d,r=2*l/c;q+=r;let s=new Polygon(p,null,null,f),t=new Arc(a,b,c,q+-0,0,f,g),u=new Polygon(JSON.parse(JSON.stringify(p)),null,null,f);s.translate(a,b),u.translate(a,b);let v=k*i(q),w=k*h(q);s.scale(-1).rotate(q,!0).translate(v,w);let x=new Mesh(u,t,s);return x.draw=function(a,b){let c=lerp(b,d,e-2*r),f=c;c>=d-r+j?c>=e-r?(f=e-r+j,c=e-r):(f=c+r+j,c+=r):f=c;let g=k*i(f),l=k*h(f);return this.shapes[0].translate(-m,0).rotate(f,!0).translate(g,l).draw(a).translate(-g,-l).rotate(-f,!0).translate(m,0),this.shapes[1].endAngle=c,this.shapes[1].draw(a),this.shapes[2].draw(a),this},x}function setRoundedArcColor(a,b){a.map(a=>{a instanceof Arc?a.color=b:a.fillColor=b})}function roundedRectangle(a,b,c,d,e){var f=Math.abs;let g=-.3,h=f((b-d)/2),i=[[a,b],[a,b-d]],j=[[a+c,b],[a+c,b-d]];c-=2*h;let k=slerpPoints(i[0],i[1],1),l=slerpPoints(j[1],j[0],-1),m=new Polygon(k,null,null,e),n=new Rectangle(a,b,c,d,e),o=new Polygon(l,null,null,e),p=-c/2,q=d/2;m.translate(p-g,q),o.translate(p-2*h,q),n.translate(p,-q);let r=new Mesh(m,n,o),[s,u]=n.centroid;return r.draw=function(a,b){let d=b*c,[e,f]=n.centroid,h=e-s-n.width/2,i=f-u-n.height/2;n.translate(-h,-i),n.width=d,n.translate(h,i),b=-(1-b)*c+g,o.translate(b,0);for(let c of this.shapes)c.draw(a);return o.translate(-b,0),this},r}function generateGradient(a,b,c,d,e,f){c=null==c?0:c,d=null==d?0:d,e=null==e?a.width:e,f=null==f?0:f;let g=a.getContext("2d"),h=g.createLinearGradient(c,d,e,f);for(let[g,i]of b)h.addColorStop(g,i);return h}function progressBarIntervals(a,b,c,d,e){let f=[],g=0,h=c/e.length-d/e.length,j=0;for(let i of e){let e=h+d,k=roundedRectangle(a,b,e,d,i);k.translate(-c/2+e/2+g,0),f.push(k),g+=h,j+=1}let k=new Mesh(...f);return k.draw=function(a,b){let c=this.shapes.length,d=1/c,e=b,f=0;for(let c of this.shapes)if(0<e)f=0<e-d?1:e/d,c.draw(a,f),e-=d;else break;return this},k}export{Canvas,progressBarIntervals,roundedArc,roundedRectangle,setRoundedArcColor,generateGradient,Mesh,Rectangle,Arc,Polygon,Shape};