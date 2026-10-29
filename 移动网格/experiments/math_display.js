/* Offline LaTeX typesetting using native MathML. */
(function(){
  const typeset=(tex,display=true)=>katex.renderToString(tex,{output:'mathml',displayMode:display,throwOnError:true});
  const matrix=m=>'\\begin{bmatrix}'+m.map(row=>row.map(v=>Number(v).toPrecision(7).replace(/e([+-]?\d+)/,'\\times10^{$1}')).join('&')).join('\\\\')+'\\end{bmatrix}';
  window.MeshMath={typeset,matrix};
  document.querySelectorAll('[data-tex]').forEach(node=>{node.innerHTML=typeset(node.dataset.tex,node.dataset.inline!=='true');});
})();
