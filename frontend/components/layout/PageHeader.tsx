"use client";

import React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({ breadcrumbs, className }: PageHeaderProps) {
  // 如果只有一个元素，渲染为简单标题
  if (breadcrumbs.length === 1) {
    return (
      <div className={className}>
        <h1 className="text-sm font-medium text-neutral-900">
          {breadcrumbs[0].label}
        </h1>
      </div>
    );
  }

  // 多个元素时渲染为完整的面包屑导航
  return (
    <div className={className}>
      <Breadcrumb>
        <BreadcrumbList className="text-sm font-medium">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink
                    asChild
                    className="truncate text-neutral-600 hover:text-neutral-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-1 rounded-sm"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate text-neutral-900">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator className="text-neutral-400" />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
