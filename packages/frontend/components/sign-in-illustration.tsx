import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '@oxy.so/bloom/theme';

// The one shape shared by all three heart badges (relative to its own
// origin) — positioned per badge with a `transform="translate(x y)"`,
// matching the source illustration's own `<use href="#heart">` pattern.
const HEART_D = 'M-1-10C-8-23-20-18-20-7C-20 4-8 17-1 24C7 16 21 1 20-9C20-20 7-22-1-10Z';

// The illustration's own original tones (from `ilustracion-hogar.svg`) —
// what the backdrop and ink looked like before this was themed at all.
// Kept as the LIGHT-mode values on purpose: recoloring them to a raw
// Bloom token (`primarySubtle`/`text`) reads as a different illustration,
// not a themed one — there's no "before" to preserve a match against in
// dark mode, but in light mode this must look like what it always did.
const ORIGINAL_BACKDROP = '#cfeafa';
const ORIGINAL_INK = '#252d29';

/**
 * A vector port of `ilustracion-hogar.svg` (the reference illustration
 * supplied for the signed-out screen — see `auth-gate.tsx`), not a raster
 * image, so it can follow Bloom's own theme instead of a flat baked-in
 * palette.
 *
 * Only TWO things are actually themed, and only in dark mode: the backdrop
 * card (`primarySubtle` — the exact token `bg-primary-subtle` already uses
 * elsewhere in the app) and the line art itself (`text`), so the outlines
 * stay legible against a dark screen instead of reading as flat black.
 * Light mode keeps the illustration's own original colors exactly.  Every
 * other fill below (the cat, the trousers, the plant print, the lamps, the
 * skin and hair tones…) is the illustration's own literal, hand-picked
 * color regardless of mode — those are the ARTWORK's colors, not UI
 * chrome, and recoloring a yellow cat to a "brand accent" would just make
 * it a worse cat.
 */
export function SignInIllustration({ width = 200 }: { width?: number }) {
  const { colors: themeColors, isDark } = useTheme();
  const backdrop = isDark ? themeColors.primarySubtle : ORIGINAL_BACKDROP;
  const ink = isDark ? themeColors.text : ORIGINAL_INK;
  const height = width * (888 / 1240);

  return (
    <Svg width={width} height={height} viewBox="0 0 1240 888" fill="none">
      <Path fill={backdrop} d="M24 548L24 124C24 60 59 25 121 24L1117 24C1181 24 1218 59 1218 124L1218 548Z" />

      {/* Hanging green print */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M605 117L695 78L785 116" />
        <Path fill="#e4f2fa" d="M691 78C689 74 692 69 697 69C702 69 705 74 702 79C700 83 694 84 691 78Z" />
        <Path fill="#a8dcae" d="M600 119L788 118L790 354L601 355Z" />
        <G stroke="#31533b" strokeWidth={5.9}>
          <Path d="M635 179C633 159 660 146 691 146C725 145 756 157 758 174C761 193 733 205 699 206C665 207 636 198 635 179Z" />
          <Path d="M635 239C634 220 660 207 692 206C726 205 756 218 760 235C763 253 735 267 701 268C666 270 638 258 635 239Z" />
          <Path d="M636 299C633 281 661 267 694 267C728 267 758 279 760 297C762 316 735 330 702 331C668 332 639 321 636 299Z" />
        </G>
      </G>

      {/* Arc floor lamp, behind the figure */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M934 265C935 219 960 192 1001 181C1048 168 1087 183 1106 215C1126 250 1126 310 1126 356L1125 402M1117 488L1115 772" />
        <Path fill="#d8edfb" d="M914 319C920 332 929 343 940 343C952 343 962 334 967 319Z" />
        <Path fill="#6a9ff1" d="M876 318C886 293 905 269 931 266C963 261 994 282 1008 315Z" />
      </G>

      {/* Table lamp */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#fbe9e7" d="M313 336L329 337L329 411C330 435 340 452 359 463L278 464C300 452 310 437 313 415Z" />
        <Path fill="#fbe7e6" d="M225 306C247 275 273 251 302 250C335 248 374 269 398 290C414 303 425 317 421 326C417 338 397 339 373 340L254 341C231 341 211 329 225 306Z" />
      </G>

      {/* Thermometer badge */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#fff0bb" d="M88 357C87 332 107 313 132 312C159 310 182 330 183 356C185 384 163 405 137 407C110 409 89 387 88 357Z" />
        <Path fill="#20241f" stroke="none" d="M128 367L129 336C129 328 140 327 141 335L143 366C149 370 151 377 149 383C147 391 137 394 130 391C120 388 118 375 128 367Z" />
        <Path stroke="#fff4d1" strokeWidth={3.4} d="M135 338L135 360" />
      </G>

      {/* White low cabinet */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#ffffff" d="M261 464L1024 464L1031 728L264 728Z" />
        <Path d="M518 466L518 726" />
        <Path fill="#ffffff" d="M284 593C284 586 290 581 297 581C304 581 310 587 310 594C310 601 304 607 297 607C290 607 284 601 284 593Z" />
        <Path fill="#ffffff" d="M542 592C542 585 548 580 554 580C561 580 567 586 567 593C567 601 561 606 554 606C547 606 542 601 542 592Z" />
      </G>

      {/* Raised white socks */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round" fill="#ffffff">
        <Path d="M479 389C485 364 496 333 502 307C507 286 511 272 515 273C520 274 520 288 521 302C522 322 528 333 542 342L530 389Z" />
        <Path d="M403 463C401 435 401 391 405 356C406 344 411 352 416 367C424 390 438 405 457 417L442 464Z" />
      </G>

      {/* Blue trousers — one continuous silhouette with a drawn leg seam */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#629cf3" d="M442 464L471 390C490 387 510 388 530 389L555 321C602 329 650 341 685 358C726 378 750 413 772 454C796 500 820 555 845 594C858 615 860 641 868 663L889 706C873 750 840 798 801 834C780 841 762 834 747 822C723 802 706 771 692 740C673 698 665 649 654 590L624 464Z" />
        <Path fill="#70a6f6" stroke="none" opacity={0.55} d="M532 388L556 324C604 332 649 344 684 361C724 381 747 414 770 455C795 501 818 555 843 595C849 605 852 618 854 631C835 600 812 557 788 506C762 450 729 411 691 393C641 372 579 365 543 365Z" />
        <Path d="M471 390C511 386 564 388 605 392C640 395 669 398 683 413C712 444 736 498 762 551L804 616" />
      </G>

      {/* Speaker beside the cabinet */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#d9effb" d="M111 611L197 612C222 612 234 628 233 652L233 800C233 826 219 839 195 839L109 839C93 839 85 822 84 799L86 655C86 630 93 611 111 611Z" />
        <Path fill="#deeff8" d="M130 681C130 665 143 653 159 653C176 653 190 665 190 681C191 697 178 710 161 711C144 711 130 698 130 681Z" />
        <Path fill="#deeff8" d="M115 766C115 743 132 725 153 725C176 724 196 742 196 766C196 789 179 808 156 808C133 808 115 791 115 766Z" />
      </G>

      {/* Yellow cat, curled tail and paws */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#ffedb6" d="M244 801C225 781 222 761 230 739C239 716 257 697 269 674C283 648 284 633 276 612C271 601 264 590 256 582C249 575 239 578 235 584C231 591 236 602 242 612C253 630 259 644 250 665C239 688 219 710 205 732C190 755 187 778 198 800C208 820 225 835 247 838L531 838C550 838 567 826 571 813C574 804 563 796 554 791L566 768C570 762 568 757 562 756C557 754 550 757 545 758C545 753 552 747 549 743C545 737 534 742 528 745C508 753 488 774 469 780C451 786 440 782 424 774L389 747C368 728 347 708 325 706C300 703 277 716 264 738C253 757 249 782 244 801Z" />
        <Path d="M293 751C312 735 335 728 349 734C363 740 367 751 362 768C357 785 349 799 342 811L381 812C397 812 405 822 405 836" />
        <Path d="M437 814C459 814 477 816 491 824L493 836" />
        <Path d="M533 760C542 764 548 774 552 782" />
        <Path d="M499 797L539 795M519 820L549 808" />
        <Path fill="#ffedb6" d="M550 835C560 828 570 825 576 836Z" />
        <Path strokeWidth={4.8} d="M574 791C587 766 608 745 630 738M584 795L624 788" />
      </G>

      {/* Figure's hair — the character's own hair color, not UI ink; left static */}
      <Path fill="#050906" stroke="#111711" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" d="M1019 636C1038 627 1056 620 1074 624C1095 628 1105 645 1107 665L1112 711C1114 730 1135 735 1147 756C1161 779 1161 806 1148 835L793 835C818 819 866 805 913 786C960 767 1008 737 1028 696C1040 675 1039 649 1019 636Z" />

      {/* Raised right forearm and gesturing hand */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#edddba" d="M911 686C919 656 927 622 934 588C937 575 935 566 928 559L919 552C914 549 912 545 915 541L929 549L915 536C909 530 911 526 918 529L942 544C954 552 961 565 960 580L954 677C941 677 926 681 911 686Z" />
        <Path strokeWidth={4.6} d="M918 538L939 558M927 550L925 557" />
      </G>

      {/* Profile and neck */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#eddfc4" d="M1041 629L1025 633L1016 638L1027 641C1023 645 1018 650 1015 656C1010 666 1017 675 1026 680C1018 685 1007 687 992 684L1005 713L1037 727C1037 703 1036 684 1056 674C1065 670 1078 669 1080 660C1082 651 1074 646 1064 650C1058 651 1051 652 1047 647C1043 642 1044 635 1047 630Z" />
      </G>

      {/* White t-shirt */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#ffffff" d="M848 754L860 719C870 700 890 688 912 681C941 671 968 675 990 683C1008 691 1022 705 1037 727C1018 750 973 774 908 787L848 771Z" />
        <Path d="M849 752L978 704" />
      </G>

      {/* Small fingertips peeking around the phone */}
      <G stroke={ink} strokeWidth={5.1} strokeLinecap="round" strokeLinejoin="round" fill="#efddb5">
        <Path d="M890 548C898 545 903 550 902 554C901 558 896 559 892 559Z" />
        <Path d="M896 560C904 557 909 562 907 566C906 570 901 572 897 570Z" />
        <Path d="M901 574C909 571 913 576 911 580C910 584 906 586 902 582Z" />
      </G>

      {/* Phone, deliberately without invented screen content */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#fff0b9" d="M846 545C858 541 878 540 890 543L914 615C902 620 884 622 871 621Z" />
        <Path stroke="#fff7d7" strokeWidth={3.2} d="M851 549L868 603" />
      </G>

      {/* Near arm, hand and thumb resting on the phone */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#f0ddb0" d="M908 787L820 816C808 821 799 817 796 806C790 790 797 768 805 747L837 677C846 657 849 636 848 616C845 607 846 594 850 586L855 578C859 573 862 578 861 584L859 602L868 589C872 583 877 586 874 595L869 614C873 635 867 657 860 677L840 742L825 758L901 732Z" />
        <Path d="M825 758L818 760M858 604L852 613M901 733L908 787" />
      </G>

      {/* Floating favorite / home heart badges */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#e0f0fb" d="M216 234C215 211 233 191 256 188C280 184 301 197 309 220C318 244 305 269 282 277C257 286 232 274 221 253C218 248 216 241 216 234Z" />
        <Path fill="none" stroke={ink} strokeWidth={5.1} strokeLinecap="round" strokeLinejoin="round" transform="translate(263 230)" d={HEART_D} />
      </G>
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#ffffff" d="M52 611C52 585 72 566 96 566C122 565 141 585 143 610C145 635 126 656 101 658C76 660 54 641 52 617Z" />
        <Path fill="none" stroke={ink} strokeWidth={5.1} strokeLinecap="round" strokeLinejoin="round" transform="translate(98 608)" d={HEART_D} />
      </G>
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#e0f0fa" d="M1073 444C1075 419 1094 402 1117 401C1142 400 1163 420 1164 445C1166 470 1147 490 1122 492C1097 494 1076 475 1073 451Z" />
        <Path fill="none" stroke={ink} strokeWidth={5.1} strokeLinecap="round" strokeLinejoin="round" transform="translate(1120 443)" d={HEART_D} />
      </G>

      {/* Ground line and toy ball */}
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M77 840C268 837 477 838 626 838M681 838C850 837 1047 836 1191 835" />
        <Path strokeWidth={4.7} d="M599 871L650 870" />
      </G>
      <G stroke={ink} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round">
        <Path fill="#f6d15f" d="M628 845C627 829 639 817 653 817C667 817 680 828 681 842C683 857 671 870 656 871C641 872 629 860 628 845Z" />
        <Path stroke="#ffe38f" strokeWidth={3} d="M646 828C635 837 638 855 649 861M654 827C665 838 665 852 656 862" />
      </G>
    </Svg>
  );
}
