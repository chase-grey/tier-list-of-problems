import React from 'react';

/**
 * A component that adds botanically accurate fern elements to the UI
 */
const NatureElements: React.FC = () => {
  return (
    <>
      {/* Large Boston fern in bottom right corner */}
      <svg 
        width="500" 
        height="500" 
        viewBox="0 0 500 500"
        style={{
          position: 'fixed',
          bottom: '-80px',
          right: '-40px',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.75,
        }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Main rachis (stem) */}
        <path 
          d="M250,450 C280,350 270,250 240,150" 
          fill="none" 
          stroke="rgba(255,255,255,0.65)" 
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Left side fronds - going up the stem */}
        <g opacity="0.65" filter="url(#glow)">
          {/* Frond 1 (bottom) */}
          <path 
            d="M250,430 C230,425 210,420 190,410 C180,400 170,385 165,370 C160,355 165,340 175,330 C185,320 200,315 215,320 C225,322 235,327 245,335" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Pinnules (leaflets) for frond 1 */}
          <path d="M190,410 C185,405 180,400 178,398" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M175,390 C170,385 165,380 163,378" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M170,370 C165,365 160,360 158,358" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M175,350 C170,345 165,340 163,338" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M190,335 C185,330 180,325 178,323" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M210,325 C205,320 200,315 198,313" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M230,330 C225,325 220,320 218,318" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />

          {/* Frond 2 */}
          <path 
            d="M250,390 C230,385 210,375 190,360 C180,345 175,330 175,315 C175,300 185,285 195,275 C205,265 220,260 235,265 C245,267 250,275 255,285" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Pinnules for frond 2 */}
          <path d="M190,360 C185,355 180,350 178,348" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M182,340 C177,335 172,330 170,328" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M175,320 C170,315 165,310 163,308" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M182,295 C177,290 172,285 170,283" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M195,280 C190,275 185,270 183,268" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M215,270 C210,265 205,260 203,258" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M235,275 C230,270 225,265 223,263" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          
          {/* More fronds going up */}
          <path 
            d="M250,350 C230,345 210,330 195,310 C185,290 180,270 185,250 C190,230 200,215 215,205 C225,200 235,200 245,210" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          <path 
            d="M245,310 C225,300 205,285 195,260 C190,240 190,220 200,200 C210,180 225,170 240,170" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        
        {/* Right side fronds */}
        <g opacity="0.65" filter="url(#glow)">
          {/* Frond 1 (bottom) */}
          <path 
            d="M250,420 C270,410 290,400 310,385 C325,370 335,355 335,335 C335,315 325,300 310,290 C295,280 280,275 265,285" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Pinnules (leaflets) for frond 1 */}
          <path d="M310,385 C315,380 320,375 322,373" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M325,365 C330,360 335,355 337,353" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M335,335 C340,330 345,325 347,323" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M325,315 C330,310 335,305 337,303" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M310,295 C315,290 320,285 322,283" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
          <path d="M290,285 C295,280 300,275 302,273" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />

          {/* Frond 2 */}
          <path 
            d="M250,380 C270,370 290,355 305,335 C315,315 320,295 315,275 C310,255 295,240 280,230 C265,220 250,220 240,230" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* More fronds */}
          <path 
            d="M245,340 C265,325 285,305 295,280 C305,255 305,230 295,210 C285,190 270,180 250,180" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        
        {/* Curled fiddlehead at the top */}
        <path 
          d="M240,150 C235,140 235,130 240,120 C245,110 255,105 265,105 C275,105 285,110 290,120 C295,130 295,140 290,150 C285,160 275,165 265,165 C255,165 245,160 240,150" 
          fill="none" 
          stroke="rgba(255,255,255,0.65)" 
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glow)"
        />
      </svg>
      
      {/* Maidenhair fern in top left */}
      <svg 
        width="350" 
        height="350" 
        viewBox="0 0 350 350"
        style={{
          position: 'fixed',
          top: '60px',
          left: '0px',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.65,
          transform: 'rotate(-15deg)',
        }}
      >
        <defs>
          <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Main stems - maidenhair ferns have multiple stems */}
        <g filter="url(#glow2)">
          {/* Central stem */}
          <path 
            d="M175,320 C180,280 185,240 175,200" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          
          {/* Fan-shaped leaves characteristic of maidenhair ferns */}
          <path 
            d="M175,280 C160,275 145,265 135,250 C125,235 120,215 125,195 C130,175 145,160 165,155 C175,152 185,154 195,160" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          
          {/* Small leaflets */}
          <path d="M135,250 C130,248 125,245 122,242" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M128,235 C123,232 118,229 115,226" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M125,215 C120,212 115,209 112,206" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M130,195 C125,192 120,189 117,186" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M145,170 C140,167 135,164 132,161" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M165,160 C160,157 155,154 152,151" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          
          {/* Another frond */}
          <path 
            d="M180,250 C195,245 210,235 220,220 C230,205 235,185 230,165 C225,145 210,130 190,125 C175,122 160,125 150,135" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          
          {/* Small leaflets */}
          <path d="M220,220 C225,217 230,214 233,211" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M228,200 C233,197 238,194 241,191" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M230,180 C235,177 240,174 243,171" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M225,165 C230,162 235,159 238,156" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M210,145 C215,142 220,139 223,136" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M190,130 C195,127 200,124 203,121" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          <path d="M170,125 C175,122 180,119 183,116" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
          
          {/* Additional stem */}
          <path 
            d="M165,320 C160,290 155,260 160,230 C165,200 180,175 200,160" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          
          {/* Another stem */}
          <path 
            d="M185,320 C190,290 195,260 190,230 C185,200 170,175 150,160" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </>
  );
};

export default NatureElements;
